import { Request, Response, NextFunction } from 'express';
import OpenAI from 'openai';
import pdfParse from 'pdf-parse';

export class PDFController {
  private static openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  // Reusable validation method
  static async validateNetlink(netlink: string | undefined) {
    if (!netlink) throw new Error("Not authenticated. Netlink is required.");
  }

  static async analyzeSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('PDF analyze endpoint hit');
      await this.validateNetlink(process.env.netID);
      
      if (!req.file) {
        console.log('No file provided');
        return res.status(400).json({ error: 'No PDF file provided' });
      }

      console.log('File received:', req.file.originalname, 'Size:', req.file.size);
      
      // Extract text from PDF
      console.log('Calling pdfParse.pdf function...');
      const pdfData = await (pdfParse as any).pdf(req.file.buffer);
      const extractedText = pdfData.text;
      console.log('PDF text extracted, length:', extractedText.length);

      // Analyze with OpenAI for study scheduler context
      const analysis = await this.analyzeForStudyScheduler(extractedText);
      console.log('OpenAI analysis complete');

      res.status(200).json({
        success: true,
        filename: req.file.originalname,
        pages: pdfData.numpages,
        extractedText: extractedText.substring(0, 1000) + '...', // Preview
        analysis: analysis,
        netID: process.env.netID
      });
    } catch (error) {
      console.error('PDF analysis error:', error);
      res.status(500).json({ 
        error: 'PDF analysis failed', 
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

  private static async analyzeForStudyScheduler(text: string) {
    try {
      console.log('Calling OpenAI API...');
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{
          role: "user",
          content: `Analyze this academic document and extract information useful for a study scheduler app. Please format your response as JSON with the following structure:
          {
            "courseInfo": {
              "courseName": "course name if found",
              "courseCode": "course code if found", 
              "instructor": "instructor name if found",
              "semester": "semester/term if found"
            },
            "assignments": [
              {
                "title": "assignment name",
                "dueDate": "due date in YYYY-MM-DD format if possible",
                "description": "brief description",
                "weight": "percentage or points if mentioned"
              }
            ],
            "exams": [
              {
                "title": "exam name",
                "date": "exam date in YYYY-MM-DD format if possible", 
                "time": "exam time if mentioned",
                "location": "exam location if mentioned"
              }
            ],
            "importantDates": [
              {
                "event": "event name",
                "date": "date in YYYY-MM-DD format if possible",
                "description": "additional details"
              }
            ],
            "topics": [
              "key course topics or learning objectives mentioned"
            ]
          }

          Document text: ${text.substring(0, 4000)}`
        }]
      });
      
      const content = response.choices[0].message.content || '{}';
      console.log('OpenAI response received, parsing...');
      
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleanContent);
    } catch (error) {
      console.error('OpenAI analysis error:', error);
      return {
        error: 'Failed to analyze document with AI',
        message: error instanceof Error ? error.message : 'Unknown error',
        rawText: text.substring(0, 500) + '...'
      };
    }
  }
}