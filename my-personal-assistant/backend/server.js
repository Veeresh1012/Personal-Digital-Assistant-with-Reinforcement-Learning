require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const { db } = require('./firebase');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const PORT = 3000;
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ========================================
// FEATURE-SPECIFIC AGENTS
// Each agent specializes in one domain
// ========================================

class FitnessAgent {
  constructor() {
    this.name = "Fitness Agent";
    this.priority = 8; // High priority for health
  }

  async process(data) {
    const { exercise, sets, reps, weight, is_pr } = data;
    const prBool = String(is_pr).toLowerCase() === 'true';
    
    await db.collection('gym_logs').add({ 
      exercise, 
      sets: parseInt(sets) || 0,
      reps: parseInt(reps) || 0,
      weight: weight ? parseFloat(weight) : null,
      is_pr: prBool, 
      timestamp: new Date() 
    });
    
    // Return structured data for coordinator
    return {
      agent: this.name,
      action: "logged_workout",
      category: "fitness",
      timeRequired: 30, // minutes estimated
      priority: this.priority,
      flexibility: "high", // Can be moved around
      preferredTime: "morning", // Best time for workouts
      data: { exercise, sets, reps, weight }
    };
  }

  async getScheduleRequirements() {
    // Get user's workout patterns
    const workouts = await db.collection('gym_logs')
      .orderBy('timestamp', 'desc')
      .limit(7)
      .get();
    
    const avgDuration = 45; // minutes
    return {
      agent: this.name,
      recommendedFrequency: 5, // days per week
      duration: avgDuration,
      preferredTimes: ["06:00-08:00", "17:00-19:00"],
      priority: this.priority
    };
  }
}

class TaskAgent {
  constructor() {
    this.name = "Task Agent";
    this.priority = 9; // Very high priority
  }

  async process(data) {
    const { task, priority = "medium" } = data;
    
    await db.collection('todos').add({ 
      task, 
      priority, 
      completed: false,
      timestamp: new Date() 
    });
    
    // Estimate time based on task complexity
    const estimatedTime = this.estimateTaskTime(task);
    
    return {
      agent: this.name,
      action: "added_task",
      category: "productivity",
      timeRequired: estimatedTime,
      priority: priority === 'high' ? 10 : priority === 'medium' ? 7 : 5,
      flexibility: priority === 'high' ? "low" : "medium",
      deadline: this.inferDeadline(task),
      data: { task, priority }
    };
  }

  estimateTaskTime(task) {
    const lowercaseTask = task.toLowerCase();
    if (lowercaseTask.includes('call') || lowercaseTask.includes('email')) return 15;
    if (lowercaseTask.includes('meeting')) return 60;
    if (lowercaseTask.includes('report') || lowercaseTask.includes('project')) return 120;
    return 30; // default
  }

  inferDeadline(task) {
    // Simple heuristic - can be improved with NLP
    if (task.toLowerCase().includes('urgent') || task.toLowerCase().includes('today')) {
      return new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours
    }
    return new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
  }

  async getScheduleRequirements() {
    const todos = await db.collection('todos')
      .where('completed', '==', false)
      .get();
    
    return {
      agent: this.name,
      pendingTasks: todos.size,
      totalEstimatedTime: todos.size * 30, // rough estimate
      priority: this.priority
    };
  }
}

class FinanceAgent {
  constructor() {
    this.name = "Finance Agent";
    this.priority = 6;
  }

  async process(data) {
    const { item, amount, type = "expense", category = "General" } = data;
    const value = parseFloat(amount) || 0;
    
    await db.collection('finance').add({ 
      item, 
      amount: value, 
      type,
      category, 
      timestamp: new Date() 
    });
    
    return {
      agent: this.name,
      action: "logged_transaction",
      category: "finance",
      timeRequired: 5, // Quick logging
      priority: type === 'expense' && value > 1000 ? 8 : this.priority,
      data: { item, amount: value, type, category }
    };
  }

  async getScheduleRequirements() {
    return {
      agent: this.name,
      recommendedActivity: "Weekly budget review",
      duration: 30,
      preferredTime: "Sunday evening",
      priority: this.priority
    };
  }
}

class JournalAgent {
  constructor() {
    this.name = "Journal Agent";
    this.priority = 5;
  }

  async process(data) {
    const { title = "", content, mood = "neutral" } = data;
    
    await db.collection('journal').add({ 
      title,
      content,
      mood,
      timestamp: new Date() 
    });
    
    return {
      agent: this.name,
      action: "wrote_journal",
      category: "wellness",
      timeRequired: 15,
      priority: this.priority,
      flexibility: "high",
      preferredTime: "evening",
      data: { title, mood }
    };
  }

  async getScheduleRequirements() {
    return {
      agent: this.name,
      recommendedFrequency: 7, // daily
      duration: 15,
      preferredTime: "20:00-22:00",
      priority: this.priority
    };
  }
}

class HealthcareAgent {
  constructor() {
    this.name = "Healthcare Agent";
    this.priority = 10; // Highest priority - health comes first
  }

  async process(data) {
    const { medicine, time, dose = "" } = data;
    
    await db.collection('medications').add({ 
      medicine,
      time,
      dose,
      taken_today: false,
      timestamp: new Date() 
    });
    
    return {
      agent: this.name,
      action: "scheduled_medication",
      category: "health",
      timeRequired: 5,
      priority: this.priority,
      flexibility: "none", // Cannot be moved
      scheduledTime: this.timeToHour(time),
      data: { medicine, time, dose }
    };
  }

  timeToHour(timeOfDay) {
    const map = {
      'morning': '08:00',
      'afternoon': '14:00',
      'evening': '18:00',
      'night': '22:00'
    };
    return map[timeOfDay.toLowerCase()] || '08:00';
  }

  async getScheduleRequirements() {
    const meds = await db.collection('medications').get();
    
    return {
      agent: this.name,
      medicationCount: meds.size,
      criticalTimes: ['08:00', '14:00', '18:00', '22:00'],
      priority: this.priority
    };
  }
}

// ========================================
// CENTRAL COORDINATOR AGENT
// Master AI that orchestrates everything
// ========================================

class CentralCoordinator {
  constructor() {
    this.name = "Central Coordinator";
    this.agents = {
      fitness: new FitnessAgent(),
      task: new TaskAgent(),
      finance: new FinanceAgent(),
      journal: new JournalAgent(),
      healthcare: new HealthcareAgent()
    };
    this.activityLog = [];
  }

  async routeToAgent(functionName, args) {
    let agentResponse;
    
    switch(functionName) {
      case 'log_workout':
        agentResponse = await this.agents.fitness.process(args);
        break;
      case 'add_task':
        agentResponse = await this.agents.task.process(args);
        break;
      case 'log_finance':
        agentResponse = await this.agents.finance.process(args);
        break;
      case 'write_journal':
        agentResponse = await this.agents.journal.process(args);
        break;
      case 'add_medication':
        agentResponse = await this.agents.healthcare.process(args);
        break;
      case 'add_habit':
        // Handle lifestyle habits
        const { habit } = args;
        await db.collection('lifestyle').add({ 
          habit, 
          timestamp: new Date() 
        });
        agentResponse = {
          agent: "Lifestyle Agent",
          action: "added_habit",
          category: "lifestyle",
          timeRequired: 10,
          priority: 6,
          data: { habit }
        };
        break;
      default:
        return { agent: "unknown", action: "none" };
    }
    
    // Log activity for learning
    this.activityLog.push({
      timestamp: new Date(),
      agent: agentResponse.agent,
      activity: agentResponse
    });
    
    return agentResponse;
  }

  async generateOptimizedSchedule() {
    console.log("🧠 Central Coordinator: Generating optimized schedule...");
    
    // Collect requirements from all agents
    const requirements = await Promise.all([
      this.agents.fitness.getScheduleRequirements(),
      this.agents.task.getScheduleRequirements(),
      this.agents.finance.getScheduleRequirements(),
      this.agents.journal.getScheduleRequirements(),
      this.agents.healthcare.getScheduleRequirements()
    ]);

    // Get pending tasks
    const todos = await db.collection('todos')
      .where('completed', '==', false)
      .orderBy('timestamp', 'desc')
      .get();

    const tasks = todos.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      estimatedTime: this.agents.task.estimateTaskTime(doc.data().task)
    }));

    // Get medications (fixed times)
    const meds = await db.collection('medications').get();
    const medications = meds.docs.map(doc => doc.data());

    // Generate day schedule (24 hours)
    const schedule = this.optimizeSchedule(tasks, medications, requirements);
    
    return schedule;
  }

  optimizeSchedule(tasks, medications, requirements) {
    const schedule = [];
    const workDay = { start: 9, end: 18 }; // 9 AM to 6 PM
    const sleepTime = { start: 23, end: 7 }; // 11 PM to 7 AM

    // Priority 1: Fixed medication times (cannot move)
    medications.forEach(med => {
      const time = this.agents.healthcare.timeToHour(med.time);
      schedule.push({
        time: time,
        duration: 5,
        activity: `Take ${med.medicine}`,
        type: "medication",
        priority: 10,
        flexible: false,
        agent: "Healthcare Agent"
      });
    });

    // Priority 2: High-priority tasks
    const highPriorityTasks = tasks.filter(t => t.priority === 'high');
    let currentHour = workDay.start;
    
    highPriorityTasks.forEach(task => {
      if (currentHour < workDay.end) {
        schedule.push({
          time: `${String(currentHour).padStart(2, '0')}:00`,
          duration: task.estimatedTime,
          activity: task.task,
          type: "task",
          priority: 10,
          flexible: false,
          agent: "Task Agent"
        });
        currentHour += Math.ceil(task.estimatedTime / 60);
      }
    });

    // Priority 3: Fitness (morning or evening)
    const fitnessReq = requirements.find(r => r.agent === "Fitness Agent");
    if (fitnessReq) {
      schedule.push({
        time: "07:00",
        duration: fitnessReq.duration,
        activity: "Workout Session",
        type: "fitness",
        priority: 8,
        flexible: true,
        alternativeTimes: ["07:00", "18:00"],
        agent: "Fitness Agent"
      });
    }

    // Priority 4: Medium priority tasks
    const mediumPriorityTasks = tasks.filter(t => t.priority === 'medium');
    mediumPriorityTasks.slice(0, 3).forEach(task => {
      if (currentHour < workDay.end - 1) {
        schedule.push({
          time: `${String(currentHour).padStart(2, '0')}:00`,
          duration: task.estimatedTime,
          activity: task.task,
          type: "task",
          priority: 7,
          flexible: true,
          agent: "Task Agent"
        });
        currentHour += Math.ceil(task.estimatedTime / 60);
      }
    });

    // Priority 5: Wellness activities
    const journalReq = requirements.find(r => r.agent === "Journal Agent");
    if (journalReq) {
      schedule.push({
        time: "21:00",
        duration: journalReq.duration,
        activity: "Evening Reflection / Journal",
        type: "wellness",
        priority: 5,
        flexible: true,
        agent: "Journal Agent"
      });
    }

    // Add breaks
    schedule.push({
      time: "12:00",
      duration: 60,
      activity: "Lunch Break",
      type: "break",
      priority: 8,
      flexible: false,
      agent: "Central Coordinator"
    });

    // Sort by time
    schedule.sort((a, b) => {
      const timeA = a.time.split(':').map(Number);
      const timeB = b.time.split(':').map(Number);
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    });

    return {
      date: new Date().toISOString().split('T')[0],
      generatedAt: new Date(),
      totalActivities: schedule.length,
      schedule: schedule,
      insights: this.generateInsights(schedule),
      balanceScore: this.calculateBalance(schedule)
    };
  }

  generateInsights(schedule) {
    const workTime = schedule.filter(s => s.type === 'task').reduce((sum, s) => sum + s.duration, 0);
    const fitnessTime = schedule.filter(s => s.type === 'fitness').reduce((sum, s) => sum + s.duration, 0);
    const wellnessTime = schedule.filter(s => s.type === 'wellness').reduce((sum, s) => sum + s.duration, 0);

    return {
      workLifeBalance: fitnessTime > 0 && wellnessTime > 0 ? "Good" : "Needs Improvement",
      totalWorkTime: `${workTime} minutes`,
      healthScore: fitnessTime >= 30 ? "Excellent" : "Could be better",
      recommendations: [
        workTime > 480 ? "Consider taking more breaks" : null,
        fitnessTime === 0 ? "Add a workout session" : null,
        wellnessTime === 0 ? "Add reflection time" : null
      ].filter(Boolean)
    };
  }

  calculateBalance(schedule) {
    const categories = {
      work: schedule.filter(s => s.type === 'task').length,
      health: schedule.filter(s => ['fitness', 'medication', 'wellness'].includes(s.type)).length,
      breaks: schedule.filter(s => s.type === 'break').length
    };

    // Ideal ratio: 5 work : 3 health : 2 breaks
    const idealRatio = { work: 5, health: 3, breaks: 2 };
    const total = categories.work + categories.health + categories.breaks;
    
    if (total === 0) return 0;

    const actualRatio = {
      work: categories.work / total,
      health: categories.health / total,
      breaks: categories.breaks / total
    };

    // Calculate deviation from ideal
    const deviation = Math.abs(actualRatio.work - idealRatio.work/10) +
                     Math.abs(actualRatio.health - idealRatio.health/10) +
                     Math.abs(actualRatio.breaks - idealRatio.breaks/10);

    return Math.max(0, Math.min(100, 100 - (deviation * 100)));
  }

  async optimizeUserSchedule(userSchedule) {
    console.log('🤖 Central Coordinator: Optimizing user-provided schedule...');
    
    // Get data from all agents to enhance the schedule
    const [todos, workouts, medications, habits] = await Promise.all([
      db.collection('todos').where('completed', '==', false).get(),
      db.collection('gym_logs').orderBy('timestamp', 'desc').limit(7).get(),
      db.collection('medications').get(),
      db.collection('lifestyle').orderBy('timestamp', 'desc').limit(5).get()
    ]);

    let optimizedSchedule = [...userSchedule];
    const suggestions = [];
    
    // Add missing medications (highest priority)
    const medTimes = ['08:00', '14:00', '18:00', '22:00'];
    medications.docs.forEach(medDoc => {
      const med = medDoc.data();
      const medTime = this.agents.healthcare.timeToHour(med.time);
      
      // Check if medication time conflicts with user schedule
      const conflict = optimizedSchedule.find(item => item.time === medTime);
      if (conflict) {
        suggestions.push(`💊 Medication "${med.medicine}" scheduled at ${medTime} conflicts with "${conflict.activity}". Consider adjusting.`);
      } else {
        optimizedSchedule.push({
          time: medTime,
          activity: `Take ${med.medicine}`,
          duration: 5,
          type: 'medication',
          priority: 10,
          flexible: false,
          agent: 'Healthcare Agent',
          addedByAI: true
        });
        suggestions.push(`✅ Added medication "${med.medicine}" at ${medTime}`);
      }
    });

    // Suggest fitness activities if missing
    const hasFitness = optimizedSchedule.some(item => 
      item.activity.toLowerCase().includes('workout') || 
      item.activity.toLowerCase().includes('exercise') ||
      item.activity.toLowerCase().includes('gym')
    );
    
    if (!hasFitness && workouts.docs.length > 0) {
      // Find a good time slot for workout
      const morningSlot = this.findAvailableSlot(optimizedSchedule, '07:00', 60);
      const eveningSlot = this.findAvailableSlot(optimizedSchedule, '18:00', 60);
      
      const workoutTime = morningSlot || eveningSlot || '07:00';
      optimizedSchedule.push({
        time: workoutTime,
        activity: 'Workout Session (AI Suggested)',
        duration: 45,
        type: 'fitness',
        priority: 8,
        flexible: true,
        agent: 'Fitness Agent',
        addedByAI: true
      });
      suggestions.push(`💪 Added workout session at ${workoutTime} based on your fitness history`);
    }

    // Suggest breaks for long work sessions
    optimizedSchedule.forEach((item, index) => {
      if (item.duration > 90 && item.type !== 'break') {
        suggestions.push(`⏰ Consider adding a break during "${item.activity}" (${item.duration} min is quite long)`);
      }
    });

    // Add urgent tasks if any
    const urgentTasks = todos.docs.filter(doc => doc.data().priority === 'high').slice(0, 2);
    urgentTasks.forEach(taskDoc => {
      const task = taskDoc.data();
      const availableSlot = this.findAvailableSlot(optimizedSchedule, '09:00', 60);
      
      if (availableSlot) {
        optimizedSchedule.push({
          time: availableSlot,
          activity: `${task.task} (High Priority)`,
          duration: this.agents.task.estimateTaskTime(task.task),
          type: 'task',
          priority: 9,
          flexible: false,
          agent: 'Task Agent',
          addedByAI: true
        });
        suggestions.push(`📝 Added high-priority task "${task.task}" at ${availableSlot}`);
      }
    });

    // Sort by time
    optimizedSchedule.sort((a, b) => a.time.localeCompare(b.time));

    // Calculate balance and insights
    const workTime = optimizedSchedule.filter(s => s.type === 'task' || s.type === 'user').reduce((sum, s) => sum + s.duration, 0);
    const healthTime = optimizedSchedule.filter(s => ['fitness', 'medication', 'wellness'].includes(s.type)).reduce((sum, s) => sum + s.duration, 0);
    const balanceScore = this.calculateBalance(optimizedSchedule);

    return {
      date: new Date().toISOString().split('T')[0],
      generatedAt: new Date(),
      totalActivities: optimizedSchedule.length,
      userActivities: userSchedule.length,
      aiSuggestions: optimizedSchedule.filter(s => s.addedByAI).length,
      schedule: optimizedSchedule,
      insights: {
        recommendations: suggestions,
        workLifeBalance: balanceScore > 70 ? 'Good Balance' : 'Needs Improvement',
        totalWorkTime: workTime,
        totalHealthTime: healthTime,
        aiEnhancements: `AI added ${optimizedSchedule.filter(s => s.addedByAI).length} suggestions to improve your schedule`
      },
      balanceScore: balanceScore
    };
  }

  findAvailableSlot(schedule, preferredTime, duration) {
    // Simple slot finding - can be enhanced
    const timeSlots = ['07:00', '08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
    
    for (const slot of timeSlots) {
      const conflict = schedule.find(item => item.time === slot);
      if (!conflict) {
        return slot;
      }
    }
    
    return preferredTime; // Fallback
  }
}

// ========================================
// INITIALIZE CENTRAL COORDINATOR
// ========================================
const coordinator = new CentralCoordinator();

// ========================================
// TOOLS (Same as before, but now routed through agents)
// ========================================
const tools = [
  {
    type: "function",
    function: {
      name: "log_workout",
      description: "Log a gym workout or exercise",
      parameters: {
        type: "object",
        properties: {
          exercise: { type: "string" },
          sets: { type: "string" },
          reps: { type: "string" },
          weight: { type: "string" },
          is_pr: { type: "string" }
        },
        required: ["exercise", "sets", "reps"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "log_finance",
      description: "Log expense or income",
      parameters: {
        type: "object",
        properties: {
          item: { type: "string" },
          amount: { type: "string" },
          type: { type: "string" },
          category: { type: "string" }
        },
        required: ["item", "amount", "type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_task",
      description: "Add a task to to-do list",
      parameters: {
        type: "object",
        properties: {
          task: { type: "string" },
          priority: { type: "string" }
        },
        required: ["task"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "write_journal",
      description: "Write a journal entry",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string" },
          mood: { type: "string" }
        },
        required: ["content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_travel_plan",
      description: "Add travel plan",
      parameters: {
        type: "object",
        properties: {
          destination: { type: "string" },
          duration: { type: "string" }
        },
        required: ["destination"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_habit",
      description: "Add lifestyle habit",
      parameters: {
        type: "object",
        properties: {
          habit: { type: "string" }
        },
        required: ["habit"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_medication",
      description: "Add medication schedule",
      parameters: {
        type: "object",
        properties: {
          medicine: { type: "string" },
          time: { type: "string" },
          dose: { type: "string" }
        },
        required: ["medicine", "time"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_schedule",
      description: "Generate optimized daily schedule based on all user data",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date for schedule (YYYY-MM-DD)" }
        }
      }
    }
  }
];

// ========================================
// MAIN CHAT ENDPOINT
// ========================================
app.post('/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;
    console.log("📨 User:", userMessage);

    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: `You are the Central Coordinator of Mitra AI, managing multiple specialized agents.

ROUTE USER REQUESTS TO APPROPRIATE AGENTS:

🏋️ FITNESS AGENT - Keywords: log, did, completed, workout, exercise, gym, fitness, training
Exercises: pushups, situps, pullups, squats, deadlifts, bench press, bicep curls, tricep dips, lat pulldowns, shoulder press, leg press, calf raises, planks, burpees, mountain climbers, jumping jacks, running, walking, cycling, swimming, jogging, biking
Formats: "Log [number] [exercise]", "Did [exercise] [sets] sets [reps] reps", "[Exercise] [duration] minutes"

📝 TASK AGENT - Keywords: add, create, task, todo, to-do, reminder, deadline, priority
Formats: "Add task [item]", "Create todo [task]", "High/Medium/Low priority [task]", "Remind me to [task]"

💰 FINANCE AGENT - Keywords: spent, paid, bought, expense, income, earned, cost, price, money
Formats: "Spent [amount] on [item]", "Paid [amount] for [item]", "Earned [amount] from [source]"

🌱 LIFESTYLE AGENT - Keywords: habit, goal, start, track, routine, daily, lifestyle
Formats: "Add habit [activity]", "Start [routine]", "Create goal [target]", "Track [behavior]"

📔 JOURNAL AGENT - Keywords: journal, write, note, reflect, mood, feeling, thought
Formats: "Write journal [content]", "Note [thought]", "Feeling [mood]"

💊 HEALTHCARE AGENT - Keywords: medicine, medication, pill, dose, health, medical
Formats: "Take [medicine] [time]", "Add medication [name] [schedule]"

Be flexible with variations and synonyms. Always extract relevant parameters and provide encouraging confirmations.`
        },
        { role: "user", content: userMessage }
      ],
      model: "llama-3.3-70b-versatile",
      tools: tools,
      tool_choice: "auto",
      temperature: 0.7
    });

    const responseMessage = completion.choices[0].message;

    if (responseMessage.tool_calls) {
      const toolCall = responseMessage.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);
      
      console.log(`🔧 Routing to agent: ${functionName}`);

      if (functionName === 'generate_schedule') {
        // Special case: generate schedule
        const schedule = await coordinator.generateOptimizedSchedule();
        res.json({ 
          reply: `✅ Optimized schedule generated!\n\nBalance Score: ${schedule.balanceScore}/100\nTotal Activities: ${schedule.totalActivities}\n\nCheck /schedule endpoint for full details.`,
          schedule: schedule
        });
      } else {
        // Route to appropriate agent
        const agentResponse = await coordinator.routeToAgent(functionName, functionArgs);
        
        // Return user-friendly message
        const messages = {
          logged_workout: `💪 Excellent! Logged ${agentResponse.data.sets}x${agentResponse.data.reps} ${agentResponse.data.exercise}${agentResponse.data.weight ? ` @ ${agentResponse.data.weight}kg` : ''}${agentResponse.data.is_pr ? ' - NEW PR! 🏆' : ''}. Keep it up!`,
          added_task: `📝 Task added by Task Agent (Priority: ${agentResponse.data.priority})`,
          logged_transaction: `💰 ${agentResponse.data.type} logged by Finance Agent`,
          wrote_journal: `📔 Journal saved by Journal Agent`,
          scheduled_medication: `💊 ${agentResponse.data.medicine} scheduled by Healthcare Agent`,
          added_habit: `🌱 Habit "${agentResponse.data.habit}" added by Lifestyle Agent`
        };
        
        res.json({ 
          reply: messages[agentResponse.action] || "✅ Action completed",
          agentResponse: agentResponse
        });
      }
    } else {
      res.json({ reply: responseMessage.content });
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// GET OPTIMIZED SCHEDULE
// ========================================
app.get('/schedule', async (req, res) => {
  try {
    const schedule = await coordinator.generateOptimizedSchedule();
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// OPTIMIZE USER-PROVIDED SCHEDULE
// ========================================
app.post('/optimize-schedule', async (req, res) => {
  try {
    const { userSchedule } = req.body;
    
    if (!userSchedule || !Array.isArray(userSchedule)) {
      return res.status(400).json({ error: 'Invalid user schedule provided' });
    }
    
    console.log('🧠 Optimizing user-provided schedule with', userSchedule.length, 'activities');
    
    const optimizedSchedule = await coordinator.optimizeUserSchedule(userSchedule);
    res.json(optimizedSchedule);
  } catch (error) {
    console.error('Error optimizing user schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// GET EXISTING ENDPOINTS
// ========================================
app.get('/tasks', async (req, res) => {
  try {
    const snapshot = await db.collection('todos').orderBy('timestamp', 'desc').get();
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/workouts', async (req, res) => {
  try {
    const snapshot = await db.collection('gym_logs').orderBy('timestamp', 'desc').limit(20).get();
    const workouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ workouts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/finance', async (req, res) => {
  try {
    const snapshot = await db.collection('finance').orderBy('timestamp', 'desc').limit(50).get();
    const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ entries });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/finance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Deleting finance entry with ID:', id);
    
    await db.collection('finance').doc(id).delete();
    console.log('Successfully deleted entry:', id);
    
    res.json({ success: true, message: 'Entry deleted permanently', id: id });
  } catch (error) {
    console.error('Error deleting finance entry:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/journal', async (req, res) => {
  try {
    const snapshot = await db.collection('journal').orderBy('timestamp', 'desc').get();
    const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ entries });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.json({ 
    status: "online", 
    message: "Mitra AI Multi-Agent System",
    architecture: "Central Coordinator + Feature-Specific Agents",
    agents: Object.keys(coordinator.agents),
    endpoints: {
      post: ["/chat", "/optimize-schedule"],
      get: ["/schedule", "/tasks", "/workouts", "/finance", "/journal"],
      delete: ["/finance/:id"]
    }
  });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   🤖 MITRA AI MULTI-AGENT SYSTEM     ║
║   📡 http://localhost:${PORT}          ║
║   🧠 Central Coordinator Active       ║
║   👥 5 Specialized Agents Online      ║
║   📊 Schedule Optimization Ready      ║
╚═══════════════════════════════════════╝

Active Agents:
  - Fitness Agent (Priority: 8)
  - Task Agent (Priority: 9)
  - Finance Agent (Priority: 6)
  - Journal Agent (Priority: 5)
  - Healthcare Agent (Priority: 10)
  `);
});