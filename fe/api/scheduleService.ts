import calendarService from './calendarService';
import taskService from './taskService';
import priorityService from './priorityService';
import kanbanLabelService from './kanbanLabelService';
import type { ICalendar } from '../types/calendar';
import type { ITask } from '../types/task';

// OpenAI integration for intelligent scheduling
interface StudySession {
  title: string;
  course: string;
  type: 'work_session' | 'study_session' | 'review_session';
  duration: number; // in hours
  date: Date;
  description: string;
  relatedAssignment?: string;
}

// Interface for parsed class information
interface ClassInfo {
  courseName: string;
  time: string;
  location: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday, etc.
  startTime: string;
  endTime: string;
}

// UVic closed dates and reading break for 2025
// Removed UVic closed days functionality

// Interface for extracted assignment/exam data
interface AssignmentData {
  title: string;
  course: string;
  dueDate: Date;
  type: 'assignment' | 'exam' | 'quiz' | 'project' | 'midterm' | 'final';
  description?: string;
}

// PDF parsing functionality
async function parsePDFForDueDates(filePath: string): Promise<AssignmentData[]> {
  try {
    console.log(`📄 Parsing PDF: ${filePath}`);
    
    // For now, we'll simulate PDF parsing with mock data
    // In a real implementation, you'd use a library like pdf-parse or PDF.js
    const assignments: AssignmentData[] = [];
    
    // Extract course name from filename
    const fileName = filePath.split('/').pop() || '';
    const courseMatch = fileName.match(/(CSC \d+|SENG \d+|MATH \d+|SPAN \d+)/);
    const course = courseMatch ? courseMatch[1] : 'Unknown Course';
    
    // Mock assignments based on course (replace with actual PDF parsing)
    if (course.includes('CSC 225')) {
      assignments.push(
        { title: 'Assignment 1', course, dueDate: new Date(2025, 8, 20), type: 'assignment', description: 'Discrete Math Problems' },
        { title: 'Assignment 2', course, dueDate: new Date(2025, 9, 15), type: 'assignment', description: 'Algorithm Analysis' },
        { title: 'Midterm Exam', course, dueDate: new Date(2025, 9, 25), type: 'midterm', description: 'In-class midterm' },
        { title: 'Final Exam', course, dueDate: new Date(2025, 11, 10), type: 'final', description: 'Comprehensive final exam' }
      );
    } else if (course.includes('SENG 265')) {
      assignments.push(
        { title: 'Assignment 1', course, dueDate: new Date(2025, 8, 25), type: 'assignment', description: 'C Programming Basics' },
        { title: 'Assignment 2', course, dueDate: new Date(2025, 9, 20), type: 'assignment', description: 'Data Structures' },
        { title: 'Midterm Exam', course, dueDate: new Date(2025, 10, 5), type: 'midterm', description: 'Programming concepts' },
        { title: 'Final Project', course, dueDate: new Date(2025, 11, 1), type: 'project', description: 'Complete software project' },
        { title: 'Final Exam', course, dueDate: new Date(2025, 11, 15), type: 'final', description: 'Comprehensive exam' }
      );
    } else if (course.includes('SENG 321')) {
      assignments.push(
        { title: 'Assignment 1', course, dueDate: new Date(2025, 8, 30), type: 'assignment', description: 'Requirements Analysis' },
        { title: 'Midterm Exam', course, dueDate: new Date(2025, 10, 8), type: 'midterm', description: 'Software Engineering Principles' },
        { title: 'Team Project', course, dueDate: new Date(2025, 10, 25), type: 'project', description: 'Group software project' },
        { title: 'Final Exam', course, dueDate: new Date(2025, 11, 12), type: 'final', description: 'Comprehensive final' }
      );
    } else if (course.includes('MATH 200')) {
      assignments.push(
        { title: 'Assignment 1', course, dueDate: new Date(2025, 8, 18), type: 'assignment', description: 'Calculus Problems Set 1' },
        { title: 'Assignment 2', course, dueDate: new Date(2025, 9, 10), type: 'assignment', description: 'Integration Techniques' },
        { title: 'Midterm Exam', course, dueDate: new Date(2025, 9, 28), type: 'midterm', description: 'Differentiation and Integration' },
        { title: 'Assignment 3', course, dueDate: new Date(2025, 10, 15), type: 'assignment', description: 'Series and Sequences' },
        { title: 'Final Exam', course, dueDate: new Date(2025, 11, 8), type: 'final', description: 'Comprehensive calculus exam' }
      );
    } else if (course.includes('SPAN 100')) {
      assignments.push(
        { title: 'Quiz 1', course, dueDate: new Date(2025, 8, 22), type: 'quiz', description: 'Vocabulary and Grammar' },
        { title: 'Assignment 1', course, dueDate: new Date(2025, 9, 5), type: 'assignment', description: 'Essay in Spanish' },
        { title: 'Midterm Exam', course, dueDate: new Date(2025, 10, 12), type: 'midterm', description: 'Oral and Written Exam' },
        { title: 'Final Project', course, dueDate: new Date(2025, 11, 20), type: 'project', description: 'Cultural presentation' },
        { title: 'Final Exam', course, dueDate: new Date(2025, 11, 18), type: 'final', description: 'Comprehensive language exam' }
      );
    }
    
    console.log(`📝 Found ${assignments.length} assignments/exams for ${course}`);
    return assignments;
    
  } catch (error) {
    console.error(`❌ Failed to parse PDF ${filePath}:`, error);
    return [];
  }
}

// Get default IDs for task creation
async function getDefaultTaskSettings() {
  try {
    // Get available priorities and kanban labels
    const [prioritiesResponse, labelsResponse] = await Promise.all([
      priorityService.getPriorities(),
      kanbanLabelService.getKanbanLabels()
    ]);
    
    const priorities = prioritiesResponse.data;
    const labels = labelsResponse.data;
    
    console.log('Available kanban labels:', labels.map(l => ({ id: l.kanbanlabelid, name: l.kanbanlabelname })));
    
    // Use first available priority
    const defaultPriorityId = priorities.length > 0 ? priorities[0].priorityid : '1';
    
    // Look for "To Do", "Todo", "Backlog", or similar starting labels
    let defaultLabelId = '1'; // fallback
    
    if (labels.length > 0) {
      const todoLabel = labels.find(label => 
        label.kanbanlabelname?.toLowerCase().includes('todo') || 
        label.kanbanlabelname?.toLowerCase().includes('to do') ||
        label.kanbanlabelname?.toLowerCase().includes('backlog') ||
        label.kanbanlabelname?.toLowerCase().includes('new') ||
        label.kanbanlabelname?.toLowerCase().includes('pending')
      );
      
      if (todoLabel) {
        defaultLabelId = todoLabel.kanbanlabelid;
        console.log(`Using kanban label: ${todoLabel.kanbanlabelname} (${todoLabel.kanbanlabelid})`);
      } else {
        // Use the first label that doesn't seem like "completed" or "done"
        const nonCompletedLabel = labels.find(label => 
          !label.kanbanlabelname?.toLowerCase().includes('complete') &&
          !label.kanbanlabelname?.toLowerCase().includes('done') &&
          !label.kanbanlabelname?.toLowerCase().includes('finished')
        );
        
        if (nonCompletedLabel) {
          defaultLabelId = nonCompletedLabel.kanbanlabelid;
          console.log(`Using first non-completed kanban label: ${nonCompletedLabel.kanbanlabelname} (${nonCompletedLabel.kanbanlabelid})`);
        } else {
          // Last resort: use first available label
          defaultLabelId = labels[0].kanbanlabelid;
          console.log(`Using first available kanban label: ${labels[0].kanbanlabelname} (${labels[0].kanbanlabelid})`);
        }
      }
    }
    
    return { defaultPriorityId, defaultLabelId };
  } catch (error) {
    console.error('Failed to get default task settings, using fallbacks:', error);
    return { defaultPriorityId: '1', defaultLabelId: '1' };
  }
}

// Parse all PDFs in StudyScheduler folder and add assignments/exams to calendar and tasks
export async function parseStudySchedulerPDFs(): Promise<void> {
  try {
    console.log('📚 Starting StudyScheduler PDF parsing...');
    
    // Get default settings for task creation
    const { defaultPriorityId, defaultLabelId } = await getDefaultTaskSettings();
    
    // Only process one PDF per course to avoid duplicates
    // Prefer "Course Outline" or "Course Schedule" over "Lecture Schedule" 
    const pdfFiles = [
      'Fall 2025 CSC 225 Lecture Schedule.pdf',
      'Fall 2025 MATH 200 Course Schedule.pdf', 
      'Fall 2025 SENG 265 Course Outline.pdf',  // Only this one for SENG 265
      'Fall 2025 SENG 321 Lecture Schedule.pdf',
      'Fall 2025 SPAN 100 Lecture Schedule.pdf'
    ];
    
    let totalAssignments = 0;
    const processedCourses = new Set<string>(); // Track which courses we've already processed
    
    // Process each PDF file
    for (const fileName of pdfFiles) {
      const filePath = `Hackathon-Mock-Data/StudyScheduler/${fileName}`;
      
      // Extract course name to check for duplicates
      const courseMatch = fileName.match(/(CSC \d+|SENG \d+|MATH \d+|SPAN \d+)/);
      const course = courseMatch ? courseMatch[1] : 'Unknown Course';
      
      // Skip if we've already processed this course
      if (processedCourses.has(course)) {
        console.log(`⏭️ Skipping ${fileName} - already processed ${course}`);
        continue;
      }
      
      processedCourses.add(course);
      const assignments = await parsePDFForDueDates(filePath);
      
      // Create calendar events for each assignment/exam
      for (const assignment of assignments) {
        try {
          // Set event time based on type
          const eventDate = new Date(assignment.dueDate);
          let startTime: Date;
          let endTime: Date;
          
          if (assignment.type === 'exam' || assignment.type === 'midterm' || assignment.type === 'final') {
            // Exams: 2-hour time slots
            eventDate.setHours(14, 0, 0, 0); // 2:00 PM
            startTime = new Date(eventDate);
            endTime = new Date(eventDate);
            endTime.setHours(16, 0, 0, 0); // 4:00 PM
          } else {
            // Assignments/Projects: All-day events (due by end of day)
            eventDate.setHours(23, 59, 0, 0); // Due by 11:59 PM
            startTime = new Date(eventDate);
            startTime.setHours(0, 0, 0, 0); // Start of day
            endTime = new Date(eventDate);
          }
          
          // Create event data
          const isAllDay = assignment.type !== 'exam' && assignment.type !== 'midterm' && assignment.type !== 'final';
          const eventData: Omit<ICalendar, 'calendarid' | 'datecreated' | 'datemodified'> = {
            title: `${assignment.course} - ${assignment.title}`,
            description: `${assignment.description || ''} (${assignment.type})`,
            location: assignment.type.includes('exam') ? 'TBD - Check course announcements' : '',
            startdatetime: startTime,
            enddatetime: endTime,
            allday: isAllDay,
            rrule: undefined // No recurrence for assignments/exams
          };
          
          // Create calendar event
          const calendarResult = await calendarService.createCalendar(eventData);
          
          // Also create a task for assignments (not exams)
          if (assignment.type === 'assignment' || assignment.type === 'project') {
            const taskData: Omit<ITask, 'taskid' | 'datecreated' | 'datemodified'> = {
              taskname: assignment.title,
              coursename: assignment.course,
              duedate: assignment.dueDate,
              kanbanlabelid: defaultLabelId,
              priorityid: defaultPriorityId,
              colour: '#3B82F6', // Default blue color for assignments
              description: assignment.description || `${assignment.type} for ${assignment.course}`
            };
            
            try {
              await taskService.createTask(taskData);
              console.log(`📋 Added task: ${assignment.course} - ${assignment.title}`);
            } catch (taskError: any) {
              console.error(`❌ Failed to create task for ${assignment.title}:`, taskError);
              // Continue even if task creation fails
            }
          }
          
          console.log(`📝 Added ${assignment.type}: ${assignment.course} - ${assignment.title} (Due: ${assignment.dueDate.toDateString()})`);
          totalAssignments++;
          
        } catch (error: any) {
          console.error(`❌ Failed to add ${assignment.title}:`, error);
        }
      }
    }
    
    console.log(`✅ StudyScheduler parsing completed! Added ${totalAssignments} assignments/exams to calendar and tasks`);
    
  } catch (error: any) {
    console.error('❌ Failed to parse StudyScheduler PDFs:', error);
    throw error;
  }
}

// Clear only assignment/exam events and related tasks (preserve classes and UVic dates)
export async function clearAssignmentsAndExams(): Promise<void> {
  try {
    console.log('🧹 Clearing assignments and exams...');
    
    // Get all calendar events and tasks
    const [calendarResponse, tasksResponse] = await Promise.all([
      calendarService.getCalendars(),
      taskService.getTasks()
    ]);
    
    const calendars = calendarResponse.data;
    const tasks = tasksResponse.data;
    
    let deletedCalendarCount = 0;
    let deletedTaskCount = 0;
    
    // Delete events that contain assignment/exam keywords in title or description
    for (const calendar of calendars) {
      const title = calendar.title.toLowerCase();
      const description = (calendar.description || '').toLowerCase();
      
      const isAssignmentOrExam = 
        title.includes('assignment') || 
        title.includes('exam') || 
        title.includes('quiz') || 
        title.includes('project') || 
        title.includes('midterm') || 
        title.includes('final') ||
        description.includes('assignment') || 
        description.includes('exam') || 
        description.includes('quiz') || 
        description.includes('project') || 
        description.includes('midterm') || 
        description.includes('final');
      
      if (isAssignmentOrExam) {
        try {
          await calendarService.deleteCalendar(calendar.calendarid);
          console.log(`🗑️ Deleted calendar event: ${calendar.title}`);
          deletedCalendarCount++;
        } catch (error: any) {
          console.error(`❌ Failed to delete calendar event ${calendar.title}:`, error);
        }
      }
    }
    
    // Delete related tasks (assignments and projects)
    for (const task of tasks) {
      const taskName = (task.taskname || '').toLowerCase();
      const courseName = (task.coursename || '').toLowerCase();
      
      const isAssignmentTask = 
        taskName.includes('assignment') || 
        taskName.includes('project') ||
        courseName.includes('csc') ||
        courseName.includes('seng') ||
        courseName.includes('math') ||
        courseName.includes('span');
      
      if (isAssignmentTask) {
        try {
          await taskService.deleteTask(task.taskid);
          console.log(`🗑️ Deleted task: ${task.coursename} - ${task.taskname}`);
          deletedTaskCount++;
        } catch (error: any) {
          console.error(`❌ Failed to delete task ${task.taskname}:`, error);
        }
      }
    }
    
    console.log(`✅ Cleared ${deletedCalendarCount} calendar events and ${deletedTaskCount} tasks`);
  } catch (error: any) {
    console.error('❌ Failed to clear assignments and exams:', error);
    throw error;
  }
}

// AI-powered study session planning using OpenAI
async function generateStudyPlan(assignments: AssignmentData[], existingEvents: ICalendar[]): Promise<StudySession[]> {
  try {
    console.log('🤖 Calling backend API to generate study plan...');
    
    // Prepare data for backend API
    const currentDate = new Date();
    const upcomingAssignments = assignments
      .filter(a => a.dueDate > currentDate)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    // Call backend API for study plan generation
    const response = await fetch('http://127.0.0.1:3002/study-plan/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assignments: upcomingAssignments,
        existingEvents: existingEvents
      })
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.studySessions || !Array.isArray(data.studySessions)) {
      throw new Error('Invalid response format from backend API');
    }

    // Convert date strings back to Date objects
    return data.studySessions.map((session: any) => ({
      ...session,
      date: new Date(session.date)
    }));

  } catch (error) {
    console.error('❌ Failed to generate AI study plan via backend:', error);
    console.log('📝 Falling back to mock study plan...');
    return generateMockStudyPlan(assignments);
  }
}

// Fallback mock study plan generator
function generateMockStudyPlan(assignments: AssignmentData[]): StudySession[] {
  const sessions: StudySession[] = [];
  const currentDate = new Date();
  
  assignments
    .filter(a => a.dueDate > currentDate)
    .forEach(assignment => {
      const daysUntilDue = Math.ceil((assignment.dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      
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
            description: `Work on ${assignment.title} - ${assignment.description}`,
            relatedAssignment: assignment.title
          });
        }
      } else if (assignment.type === 'exam' || assignment.type === 'midterm' || assignment.type === 'final') {
        // Schedule multiple study sessions for exams
        const numSessions = daysUntilDue > 21 ? 5 : Math.max(3, Math.floor(daysUntilDue / 7));
        
        for (let i = 0; i < numSessions; i++) {
          const sessionDate = new Date(currentDate);
          sessionDate.setDate(currentDate.getDate() + Math.floor(daysUntilDue * (0.2 + (i * 0.15))));
          sessionDate.setHours(15 + (i % 3), 0, 0, 0); // Vary times
          
          const sessionType = i < numSessions - 1 ? 'study_session' : 'review_session';
          
          sessions.push({
            title: `${sessionType === 'review_session' ? 'Final Review' : 'Study Session'}: ${assignment.title}`,
            course: assignment.course,
            type: sessionType,
            duration: sessionType === 'review_session' ? 3 : 2,
            date: sessionDate,
            description: `${sessionType === 'review_session' ? 'Final review for' : 'Study for'} ${assignment.title}`,
            relatedAssignment: assignment.title
          });
        }
      }
    });
  
  return sessions;
}

// Generate AI-powered study schedule and add to calendar
export async function generateAIStudySchedule(): Promise<void> {
  try {
    console.log('🤖 Generating AI-powered study schedule...');
    
    // Get current assignments/exams and existing calendar events
    const [calendarResponse, tasksResponse] = await Promise.all([
      calendarService.getCalendars(),
      taskService.getTasks()
    ]);
    
    const existingEvents = calendarResponse.data;
    const tasks = tasksResponse.data;
    
    // Extract assignment data from existing calendar events and tasks
    const assignments: AssignmentData[] = [];
    
    // Get assignments from calendar events
    existingEvents.forEach(event => {
      const title = event.title.toLowerCase();
      if (title.includes('assignment') || title.includes('exam') || title.includes('project') || title.includes('quiz') || title.includes('midterm') || title.includes('final')) {
        const courseMatch = event.title.match(/(CSC \d+|SENG \d+|MATH \d+|SPAN \d+)/);
        const course = courseMatch ? courseMatch[1] : 'Unknown Course';
        
        let type: AssignmentData['type'] = 'assignment';
        if (title.includes('exam') || title.includes('final')) type = 'final';
        else if (title.includes('midterm')) type = 'midterm';
        else if (title.includes('project')) type = 'project';
        else if (title.includes('quiz')) type = 'quiz';
        
        assignments.push({
          title: event.title.replace(course + ' - ', ''),
          course,
          dueDate: new Date(event.startdatetime),
          type,
          description: event.description || ''
        });
      }
    });
    
    console.log(`📚 Found ${assignments.length} assignments/exams to schedule study sessions for`);
    
    if (assignments.length === 0) {
      console.log('ℹ️ No assignments found. Make sure to run parseAssignments() first.');
      return;
    }
    
    // Generate AI study plan
    const studySessions = await generateStudyPlan(assignments, existingEvents);
    
    console.log(`📅 Generated ${studySessions.length} study sessions`);
    
    let createdSessions = 0;
    
    // Create calendar events for each study session
    for (const session of studySessions) {
      try {
        const startTime = new Date(session.date);
        const endTime = new Date(session.date);
        endTime.setHours(endTime.getHours() + session.duration);
        
        const eventData: Omit<ICalendar, 'calendarid' | 'datecreated' | 'datemodified'> = {
          title: session.title,
          description: `AI-Generated Session\n\n${session.description}\n\nDuration: ${session.duration} hours\nType: ${session.type.replace('_', ' ').toUpperCase()}`,
          location: 'Study Location TBD',
          startdatetime: startTime,
          enddatetime: endTime,
          allday: false,
          rrule: undefined
        };
        
        await calendarService.createCalendar(eventData);
        console.log(`✅ Created study session: ${session.title} on ${session.date.toDateString()}`);
        createdSessions++;
        
      } catch (error: any) {
        console.error(`❌ Failed to create study session ${session.title}:`, error);
      }
    }
    
    console.log(`🎯 AI Study Schedule completed! Created ${createdSessions} study sessions`);
    
  } catch (error: any) {
    console.error('❌ Failed to generate AI study schedule:', error);
    throw error;
  }
}

// Clear AI-generated study sessions
export async function clearStudySessions(): Promise<void> {
  try {
    console.log('🧹 Clearing AI-generated study sessions...');
    
    const response = await calendarService.getCalendars();
    const calendars = response.data;
    
    let deletedCount = 0;
    
    for (const calendar of calendars) {
      const title = calendar.title.toLowerCase();
      const description = (calendar.description || '').toLowerCase();
      
      // Identify AI-generated study sessions
      const isStudySession = 
        title.includes('study session') || 
        title.includes('work session') || 
        title.includes('review session') ||
        description.includes('ai-generated session');
      
      if (isStudySession) {
        try {
          await calendarService.deleteCalendar(calendar.calendarid);
          console.log(`🗑️ Deleted study session: ${calendar.title}`);
          deletedCount++;
        } catch (error: any) {
          console.error(`❌ Failed to delete study session ${calendar.title}:`, error);
        }
      }
    }
    
    console.log(`✅ Cleared ${deletedCount} AI-generated study sessions`);
  } catch (error: any) {
    console.error('❌ Failed to clear study sessions:', error);
    throw error;
  }
}

// Add all important UVic dates to the calendar
async function addUVicImportantDates(): Promise<void> {
  const importantDates = [
    // September 2025
    { date: new Date(2025, 8, 1), title: "University Closed (Labour Day)", allDay: true },
    { date: new Date(2025, 8, 2), title: "First year registration and opening assembly for Faculty of Law", allDay: true },
    { date: new Date(2025, 8, 3), title: "First term classes begin for all faculties", allDay: true },
    { date: new Date(2025, 8, 11), title: "Last day for adding or dropping courses in the Faculty of Law", allDay: true },
    { date: new Date(2025, 8, 16), title: "Last day for 100% reduction of tuition fees for standard first term and full year courses", allDay: true },
    { date: new Date(2025, 8, 19), title: "Last day for adding courses that begin in the first term (except Faculty of Law)", allDay: true },
    { date: new Date(2025, 8, 30), title: "Last day for paying first term fees without penalty", allDay: true },
    { date: new Date(2025, 8, 30), title: "University Closed (National Day for Truth and Reconciliation)", allDay: true },
    
    // October 2025
    { date: new Date(2025, 9, 3), title: "Senate meets", allDay: true },
    { date: new Date(2025, 9, 7), title: "Last day for 50% reduction of tuition fees for standard courses", allDay: true },
    { date: new Date(2025, 9, 13), title: "University Closed (Thanksgiving Day)", allDay: true },
    { date: new Date(2025, 9, 24), title: "Senate Committee on Academic Standards meets to approve Convocation lists", allDay: true },
    { date: new Date(2025, 9, 31), title: "Last day for withdrawing from first term courses without penalty of failure", allDay: true },
    
    // November 2025
    { date: new Date(2025, 10, 7), title: "Senate meets", allDay: true },
    { date: new Date(2025, 10, 10), title: "Reading Break for all faculties", allDay: true },
    { date: new Date(2025, 10, 10), title: "Fall Convocation", allDay: true },
    { date: new Date(2025, 10, 11), title: "University Closed (Remembrance Day)", allDay: true },
    { date: new Date(2025, 10, 11), title: "Reading Break for all faculties", allDay: true },
    { date: new Date(2025, 10, 12), title: "Reading Break for all faculties", allDay: true },
    { date: new Date(2025, 10, 12), title: "Fall Convocation", allDay: true },
    { date: new Date(2025, 10, 15), title: "Faculty of Graduate Studies deadline to apply to graduate for Spring Convocation", allDay: true },
    
    // December 2025
    { date: new Date(2025, 11, 3), title: "Last day of classes in first term for all faculties", allDay: true },
    { date: new Date(2025, 11, 3), title: "National Day of Remembrance and Action on Violence Against Women", allDay: true },
    { date: new Date(2025, 11, 4), title: "S.E.L. days (Student Experience of Learning survey)", allDay: true },
    { date: new Date(2025, 11, 5), title: "S.E.L. days (Student Experience of Learning survey)", allDay: true },
    { date: new Date(2025, 11, 5), title: "Senate meets", allDay: true },
    { date: new Date(2025, 11, 6), title: "First term examinations begin for all faculties", allDay: true },
    { date: new Date(2025, 11, 15), title: "Undergraduate deadline to apply to graduate for Spring Convocation", allDay: true },
    { date: new Date(2025, 11, 20), title: "First term examinations end for all faculties", allDay: true },
    { date: new Date(2025, 11, 25), title: "University closed (Winter Break)", allDay: true },
    { date: new Date(2025, 11, 26), title: "University closed (Winter Break)", allDay: true },
    { date: new Date(2025, 11, 27), title: "University closed (Winter Break)", allDay: true },
    { date: new Date(2025, 11, 28), title: "University closed (Winter Break)", allDay: true },
    { date: new Date(2025, 11, 29), title: "University closed (Winter Break)", allDay: true },
    { date: new Date(2025, 11, 30), title: "University closed (Winter Break)", allDay: true },
    { date: new Date(2025, 11, 31), title: "University closed (Winter Break)", allDay: true },
  ];

  console.log('📅 Adding UVic important dates...');
  
  for (const event of importantDates) {
    try {
      const eventData: Omit<ICalendar, 'calendarid' | 'datecreated' | 'datemodified'> = {
        title: event.title,
        description: 'UVic Important Date',
        location: 'University of Victoria',
        startdatetime: event.date,
        enddatetime: new Date(event.date.getTime() + 60 * 60 * 1000), // 1 hour duration
        allday: event.allDay,
        rrule: undefined, // No recurrence for these dates
        tzid: 'America/Vancouver'
      };

      await calendarService.createCalendar(eventData);
      console.log(`✅ Added UVic date: ${event.title}`);
    } catch (error: any) {
      console.error(`❌ Failed to add UVic date ${event.title}:`, error);
    }
  }
}

// Parse time string like "8:30-9:50am" or "2:30-3:20pm"
function parseTimeRange(timeStr: string): { startTime: string; endTime: string } {
  const cleanTime = timeStr.trim();
  
  // Handle cases like "8:30-9:50am" or "2:30-3:20pm"
  const timeRegex = /(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})(am|pm)/i;
  const match = cleanTime.match(timeRegex);
  
  if (!match) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }
  
  const [, startHour, startMin, endHour, endMin, period] = match;
  
  let startHour24 = parseInt(startHour);
  let endHour24 = parseInt(endHour);
  
  // Convert to 24-hour format
  if (period.toLowerCase() === 'pm') {
    if (startHour24 !== 12) startHour24 += 12;
    if (endHour24 !== 12) endHour24 += 12;
  } else if (period.toLowerCase() === 'am') {
    if (startHour24 === 12) startHour24 = 0;
    if (endHour24 === 12) endHour24 = 0;
  }
  
  // Handle cases where end time is in next period (e.g., 11:30am-12:20pm)
  if (endHour24 < startHour24) {
    endHour24 += 12;
  }
  
  const formatTime = (hour: number, min: string) => 
    `${hour.toString().padStart(2, '0')}:${min}`;
  
  return {
    startTime: formatTime(startHour24, startMin),
    endTime: formatTime(endHour24, endMin)
  };
}

// Parse schedule HTML content and extract class information
export function parseScheduleHTML(htmlContent: string): ClassInfo[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  
  const classes: ClassInfo[] = [];
  const dayElements = doc.querySelectorAll('.day');
  
  dayElements.forEach((dayElement, dayIndex) => {
    // Skip empty days and reading break days
    if (dayElement.classList.contains('empty') || 
        dayElement.classList.contains('reading-break')) {
      return;
    }
    
    const dayNumber = dayElement.querySelector('.day-number')?.textContent;
    if (!dayNumber) return;
    
    const classElements = dayElement.querySelectorAll('.class');
    console.log(`📅 Day ${dayNumber}: Found ${classElements.length} class elements`);
    
    classElements.forEach((classElement, index) => {
      try {
        const classText = classElement.textContent?.trim();
        console.log(`  📝 Class ${index}: "${classText}"`);
        
        if (!classText) {
          console.log(`    ⚠️ No text content found`);
          return;
        }
        
        // Parse the single-line format: "MATH 2008:30-9:50amHSD A240"
        // Extract: course name, time, and location using regex
        const classMatch = classText.match(/^([A-Z]+\s+\d+[A-Z]*)(\d{1,2}:\d{2}-\d{1,2}:\d{2}[ap]m)(.+)$/);
        
        if (!classMatch) {
          console.log(`    ⚠️ Could not parse class format: "${classText}"`);
          return;
        }
        
        const courseName = classMatch[1].trim();
        const time = classMatch[2];
        const location = classMatch[3].trim();
        
        console.log(`    ✅ Parsed - Course: "${courseName}", Time: "${time}", Location: "${location}"`);
        
        // Determine day of week based on calendar structure
        // The calendar has headers: Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday
        const allDays = Array.from(dayElements);
        const dayPosition = allDays.indexOf(dayElement);
        const dayOfWeek = dayPosition % 7; // 0=Sunday, 1=Monday, etc.
        
        // Get the actual day number from the element
        const dayNumberEl = dayElement.querySelector('.day-number');
        const dayNumberText = dayNumberEl?.textContent?.trim();
        
        console.log(`📍 Day ${dayNumberText}: position ${dayPosition}, dayOfWeek ${dayOfWeek}, classes: ${classElements.length}`);
        
        const { startTime, endTime } = parseTimeRange(time);
        
        classes.push({
          courseName,
          time,
          location,
          dayOfWeek,
          startTime,
          endTime
        });
      } catch (error) {
        console.warn(`Failed to parse class: ${error}`);
      }
    });
  });
  
  return classes;
}

// Get unique classes (remove duplicates) and determine their weekly schedule
export function getUniqueClassSchedule(classes: ClassInfo[]): ClassInfo[] {
  const uniqueClasses = new Map<string, ClassInfo>();
  
  classes.forEach(classInfo => {
    const key = `${classInfo.courseName}-${classInfo.dayOfWeek}-${classInfo.startTime}`;
    if (!uniqueClasses.has(key)) {
      uniqueClasses.set(key, classInfo);
    }
  });
  
  return Array.from(uniqueClasses.values());
}

// Convert day of week number to RFC weekday code
function dayOfWeekToRFC(dayOfWeek: number): string {
  const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  return days[dayOfWeek];
}

// Generate calendar events from class schedule
export async function autoPopulateCalendarFromSchedule(
  htmlContent: string,
  startDate: Date = new Date(2025, 8, 3), // September 3, 2025
  endDate: Date = new Date(2025, 11, 3)   // December 3, 2025
): Promise<void> {
  try {
    console.log('🚀 Starting schedule import...');
    console.log('📄 HTML content length:', htmlContent.length);
    
    // First, add all the important UVic dates
    await addUVicImportantDates();
    
    const allClasses = parseScheduleHTML(htmlContent);
    console.log('📋 Raw classes found:', allClasses.length);
    console.log('📋 All classes:', allClasses);
    
    const uniqueClasses = getUniqueClassSchedule(allClasses);
    console.log('✨ Unique classes:', uniqueClasses.length);
    console.log('✨ Unique classes detail:', uniqueClasses);
    
    for (const classInfo of uniqueClasses) {
      console.log(`📅 Processing: ${classInfo.courseName} on ${dayOfWeekToRFC(classInfo.dayOfWeek)}s...`);
      
      // Find the first occurrence of this day of week on or after the start date
      const firstOccurrence = new Date(startDate);
      let daysToAdd = (classInfo.dayOfWeek - firstOccurrence.getDay() + 7) % 7;
      
      // If the calculated date is the start date itself and matches the day of week, use it
      if (daysToAdd === 0 && firstOccurrence.getDay() === classInfo.dayOfWeek) {
        // Perfect, start date matches the day of week
      } else {
        firstOccurrence.setDate(firstOccurrence.getDate() + daysToAdd);
      }
      
      // Create start and end datetime
      const [startHour, startMin] = classInfo.startTime.split(':').map(Number);
      const [endHour, endMin] = classInfo.endTime.split(':').map(Number);
      
      const startDateTime = new Date(firstOccurrence);
      startDateTime.setHours(startHour, startMin, 0, 0);
      
      const endDateTime = new Date(firstOccurrence);
      endDateTime.setHours(endHour, endMin, 0, 0);
      
      // Build simple RRULE for weekly recurrence until end date
      const weekday = dayOfWeekToRFC(classInfo.dayOfWeek);
      const untilDate = new Date(endDate);
      untilDate.setHours(23, 59, 59, 999);
      
      // Format UNTIL date as YYYYMMDDTHHMMSSZ in UTC
      const untilUTC = untilDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      const rrule = `FREQ=WEEKLY;BYDAY=${weekday};UNTIL=${untilUTC}`;
      
      // Create the calendar event
      const eventData: Omit<ICalendar, 'calendarid' | 'datecreated' | 'datemodified'> = {
        title: `${classInfo.courseName}`,
        description: `Location: ${classInfo.location}`,
        location: classInfo.location,
        startdatetime: startDateTime,
        enddatetime: endDateTime,
        allday: false,
        rrule: rrule,
        tzid: 'America/Vancouver' // Assuming Pacific timezone for UVic
      };
      
      console.log('📝 Event data:', {
        title: eventData.title,
        startdatetime: eventData.startdatetime,
        enddatetime: eventData.enddatetime,
        rrule: eventData.rrule,
        location: eventData.location
      });
      
      try {
        const result = await calendarService.createCalendar(eventData);
        console.log(`✅ Successfully added ${classInfo.courseName}:`, result);
      } catch (error: any) {
        console.error(`❌ Failed to add ${classInfo.courseName}:`, error);
        console.error('Error details:', error.response?.data || error.message);
      }
    }
    
    console.log('✅ Calendar auto-population completed!');
  } catch (error) {
    console.error('❌ Failed to auto-populate calendar:', error);
    throw error;
  }
}

// Convenience function to load schedule from file and populate calendar
export async function autoPopulateFromScheduleFile(filePath: string): Promise<void> {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to load schedule file: ${response.status}`);
    }
    
    const htmlContent = await response.text();
    await autoPopulateCalendarFromSchedule(htmlContent);
  } catch (error) {
    console.error('Failed to load schedule from file:', error);
    throw error;
  }
}



// Clear all calendar events (for testing purposes)
export async function clearAllCalendarEvents(): Promise<void> {
  try {
    console.log('🧹 Starting calendar cleanup...');
    
    // Get all calendar events
    const response = await calendarService.getCalendars();
    const calendars = response.data;
    
    console.log(`📋 Found ${calendars.length} calendar events to delete`);
    
    // Delete each calendar event
    for (const calendar of calendars) {
      try {
        await calendarService.deleteCalendar(calendar.calendarid);
        console.log(`🗑️ Deleted event: ${calendar.title}`);
      } catch (error: any) {
        console.error(`❌ Failed to delete event ${calendar.title}:`, error);
      }
    }
    
    console.log('✅ Calendar cleanup completed!');
  } catch (error: any) {
    console.error('❌ Calendar cleanup failed:', error);
    throw error;
  }
}

export default {
  parseScheduleHTML,
  getUniqueClassSchedule,
  autoPopulateCalendarFromSchedule,
  autoPopulateFromScheduleFile,
  clearAllCalendarEvents,
  addUVicImportantDates,
  parseStudySchedulerPDFs,
  clearAssignmentsAndExams,
  generateAIStudySchedule,
  clearStudySessions
};