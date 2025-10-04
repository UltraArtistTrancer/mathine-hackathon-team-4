import { Request, Response } from 'express';

interface StudySession {
  title: string;
  course: string;
  type: 'work_session' | 'study_session' | 'review_session';
  duration: number; // in hours
  date: Date;
  description: string;
  relatedAssignment?: string;
}

interface AssignmentData {
  title: string;
  course: string;
  dueDate: Date;
  type: 'assignment' | 'exam' | 'quiz' | 'project' | 'midterm' | 'final';
  description?: string;
}

// Generate AI-powered study plan using OpenAI
export async function generateStudyPlan(req: Request, res: Response) {
  try {
    const { assignments } = req.body;
    
    if (!assignments || !Array.isArray(assignments)) {
      return res.status(400).json({ error: 'Assignments array is required' });
    }
    
    console.log('🤖 Generating AI study plan for', assignments.length, 'assignments');
    
    // Get OpenAI API key from environment
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      console.warn('⚠️ OpenAI API key not configured. Using mock study plan.');
      const mockPlan = generateMockStudyPlan(assignments);
      return res.json({ studySessions: mockPlan, source: 'mock' });
    }

    // Prepare data for OpenAI
    const currentDate = new Date();
    const upcomingAssignments = assignments
      .filter((a: AssignmentData) => new Date(a.dueDate) > currentDate)
      .sort((a: AssignmentData, b: AssignmentData) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    if (upcomingAssignments.length === 0) {
      return res.json({ studySessions: [], message: 'No upcoming assignments found' });
    }

    // Create prompt for OpenAI
    const prompt = `
You are an AI study planner for university students. Based on the following upcoming assignments and exams, create an optimal study schedule.

Current Date: ${currentDate.toDateString()}

Upcoming Assignments/Exams:
${upcomingAssignments.map((a: AssignmentData) => 
  `- ${a.course} ${a.title} (${a.type}) - Due: ${new Date(a.dueDate).toDateString()} - ${a.description || 'No description'}`
).join('\n')}

Please create a study plan with the following guidelines:
1. For assignments: Schedule 2-3 work sessions spread over 1-2 weeks before due date
2. For exams: Schedule multiple study sessions starting 2-3 weeks before exam date
3. Each session should be 1-3 hours long
4. Avoid scheduling on weekends unless necessary
5. Space sessions to allow for proper learning and retention
6. Consider the difficulty and time requirements of each task
7. Schedule sessions between 9 AM and 8 PM on weekdays
8. Include specific, actionable descriptions for each session

Return a JSON array of study sessions with this exact format:
[
  {
    "title": "Work Session: Assignment 1",
    "course": "CSC 225", 
    "type": "work_session",
    "duration": 2,
    "date": "2025-10-10T14:00:00.000Z",
    "description": "Start working on discrete math problems - focus on proof techniques",
    "relatedAssignment": "Assignment 1"
  }
]

Only return valid JSON, no other text.`;

    try {
      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI study planner that creates optimal study schedules for university students. Always return valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} - ${await response.text()}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content;
      
      if (!aiResponse) {
        throw new Error('No response from OpenAI');
      }

      // Parse AI response
      let studySessions;
      try {
        studySessions = JSON.parse(aiResponse);
      } catch (parseError) {
        console.error('Failed to parse OpenAI response as JSON:', aiResponse);
        throw new Error('Invalid JSON response from OpenAI');
      }
      
      // Ensure dates are properly formatted
      const formattedSessions = studySessions.map((session: any) => ({
        ...session,
        date: new Date(session.date)
      }));

      console.log(`✅ Generated ${formattedSessions.length} AI study sessions`);
      return res.json({ studySessions: formattedSessions, source: 'openai' });

    } catch (apiError) {
      console.error('❌ OpenAI API call failed:', apiError);
      console.log('📝 Falling back to mock study plan...');
      
      const mockPlan = generateMockStudyPlan(assignments);
      return res.json({ studySessions: mockPlan, source: 'mock_fallback' });
    }
    
  } catch (error) {
    console.error('❌ Study plan generation failed:', error);
    res.status(500).json({ error: 'Failed to generate study plan' });
  }
}

// Fallback mock study plan generator
function generateMockStudyPlan(assignments: AssignmentData[]): StudySession[] {
  const sessions: StudySession[] = [];
  const currentDate = new Date();
  
  assignments
    .filter(a => new Date(a.dueDate) > currentDate)
    .forEach(assignment => {
      const daysUntilDue = Math.ceil((new Date(assignment.dueDate).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (assignment.type === 'assignment' || assignment.type === 'project') {
        // Schedule 2-3 work sessions for assignments
        const numSessions = daysUntilDue > 14 ? 3 : 2;
        
        for (let i = 0; i < numSessions; i++) {
          const sessionDate = new Date(currentDate);
          sessionDate.setDate(currentDate.getDate() + Math.floor(daysUntilDue * (0.3 + (i * 0.3))));
          sessionDate.setHours(14 + (i % 2) * 2, 0, 0, 0); // 2 PM or 4 PM
          
          sessions.push({
            title: `Work Session: ${assignment.title}`,
            course: assignment.course,
            type: 'work_session',
            duration: 2,
            date: sessionDate,
            description: `Work on ${assignment.title} - ${assignment.description || 'Complete the assignment requirements'}`,
            relatedAssignment: assignment.title
          });
        }
      } else if (assignment.type === 'exam' || assignment.type === 'midterm' || assignment.type === 'final') {
        // Schedule multiple study sessions for exams
        const numSessions = daysUntilDue > 21 ? 5 : Math.max(3, Math.floor(daysUntilDue / 7));
        
        for (let i = 0; i < numSessions; i++) {
          const sessionDate = new Date(currentDate);
          sessionDate.setDate(currentDate.getDate() + Math.floor(daysUntilDue * (0.2 + (i * 0.15))));
          sessionDate.setHours(15 + (i % 3), 0, 0, 0); // Vary times: 3 PM, 4 PM, 5 PM
          
          const sessionType = i < numSessions - 1 ? 'study_session' : 'review_session';
          
          sessions.push({
            title: `${sessionType === 'review_session' ? 'Final Review' : 'Study Session'}: ${assignment.title}`,
            course: assignment.course,
            type: sessionType,
            duration: sessionType === 'review_session' ? 3 : 2,
            date: sessionDate,
            description: `${sessionType === 'review_session' ? 'Final review and practice problems for' : 'Study material for'} ${assignment.title}`,
            relatedAssignment: assignment.title
          });
        }
      }
    });
  
  return sessions;
}