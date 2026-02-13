import db from '../db.js';

// Fetch all events
export const getAllEvents = async (req, res) => {
  try {
    // Get all rows with events or holidays
    const [rows] = await db.query(
      `SELECT * FROM academic_calendar WHERE (Event_Title IS NOT NULL AND TRIM(Event_Title) <> '') OR Status = 'H'`
    );
    // Debug log for rows
    console.log('Fetched rows:', rows);
    // Map DB rows to FullCalendar event objects
    const events = rows.map(row => {
      let start = row.Calendar_Date;
      let end = row.Calendar_Date;
      if (row.Event_Timing && row.Event_Timing.includes(' to ')) {
        const [startDate, endDate] = row.Event_Timing.split(' to ');
        start = startDate;
        end = endDate || startDate;
      } else if (row.Event_Timing) {
        start = row.Event_Timing;
        end = row.Event_Timing;
      }
      // If Status is 'H' and Event_Title is null, show as Holiday
      const isHoliday = row.Status === 'H' && (!row.Event_Title || row.Event_Title.trim() === '');
      return {
        id: row.Id?.toString(),
        title: isHoliday ? 'Holiday' : row.Event_Title?.trim(),
        description: isHoliday ? '' : row.Description,
        category: isHoliday ? 'holiday' : row.Label,
        start,
        end,
        eventTiming: row.Event_Timing
      };
    });
    res.json(events);
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ error: err.message });
  }
};

// Add new event
export const addEvent = async (req, res) => {
  try {
    const { title, description, category, startDate, endDate } = req.body;
    const eventTiming = `${startDate} to ${endDate}`;
    // Determine status value
    const status = category === 'holiday' ? 'H' : 'W';

    // Get all dates between startDate and endDate (inclusive)
    const getDatesInRange = (start, end) => {
      const dates = [];
      let current = new Date(start);
      const last = new Date(end);
      while (current <= last) {
        dates.push(current.toISOString().slice(0, 10));
        current.setDate(current.getDate() + 1);
      }
      return dates;
    };
    const dates = getDatesInRange(startDate, endDate);

    for (const date of dates) {
      // Try to update existing row
      const [result] = await db.query(
        `UPDATE academic_calendar SET Event_Title=?, Description=?, Label=?, Event_Timing=?, Status=? WHERE Calendar_Date=?`,
        [title, description, category, eventTiming, status, date]
      );
      if (result.affectedRows === 0) {
        // Insert new row if not exists
        await db.query(
          `INSERT INTO academic_calendar (Calendar_Date, Event_Title, Description, Label, Event_Timing, Status) VALUES (?, ?, ?, ?, ?, ?)`,
          [date, title, description, category, eventTiming, status]
        );
      }
    }
    res.json({ message: 'Event added successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Edit event
export const editEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, startDate, endDate } = req.body;
    const eventTiming = `${startDate} to ${endDate}`;
    const status = category === 'holiday' ? 'H' : 'W';
    await db.query(
      `UPDATE academic_calendar SET Event_Title=?, Description=?, Label=?, Event_Timing=?, Calendar_Date=?, Status=? WHERE Id=?`,
      [title, description, category, eventTiming, startDate, status, id]
    );
    res.json({ message: 'Event updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete event
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(
      `UPDATE academic_calendar SET Event_Title=NULL, Event_Timing=NULL, Label=NULL, Description=NULL WHERE Id=?`,
      [id]
    );
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get academic year date range
export const getAcademicYearRange = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM academic_calendar_date_fix ORDER BY Id DESC LIMIT 1'
    );
    
    if (rows.length > 0) {
      res.json({
        startDate: rows[0].Start_Date,
        endDate: rows[0].End_Date,
        totalWeeks: rows[0].Total_Weeks
      });
    } else {
      res.json(null);
    }
  } catch (err) {
    console.error('Error fetching academic year range:', err);
    res.status(500).json({ error: err.message });
  }
};

// Save or update academic year date range
export const saveAcademicYearRange = async (req, res) => {
  try {
    const { startDate, endDate, totalWeeks } = req.body;
    
    // Check if a record already exists
    const [existing] = await db.query(
      'SELECT * FROM academic_calendar_date_fix LIMIT 1'
    );
    
    if (existing.length > 0) {
      // Update existing record
      await db.query(
        'UPDATE academic_calendar_date_fix SET Start_Date=?, End_Date=?, Total_Weeks=?, Updated_At=NOW() WHERE Id=?',
        [startDate, endDate, totalWeeks, existing[0].Id]
      );
    } else {
      // Insert new record
      await db.query(
        'INSERT INTO academic_calendar_date_fix (Start_Date, End_Date, Total_Weeks, Created_At, Updated_At) VALUES (?, ?, ?, NOW(), NOW())',
        [startDate, endDate, totalWeeks]
      );
    }
    
    // Generate and insert dates into academic_calendar table
    await generateAcademicCalendarDates(startDate, endDate);
    
    res.json({ message: 'Academic year range saved and calendar dates generated successfully' });
  } catch (err) {
    console.error('Error saving academic year range:', err);
    res.status(500).json({ error: err.message });
  }
};

// Helper function to generate calendar dates
const generateAcademicCalendarDates = async (startDate, endDate) => {
  try {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Get all dates between startDate and endDate
    const getDatesInRange = (start, end) => {
      const dates = [];
      let current = new Date(start);
      const last = new Date(end);
      
      while (current <= last) {
        const dayOfWeek = current.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const dayOrder = dayNames[dayOfWeek];
        const isSunday = dayOfWeek === 0;
        
        dates.push({
          date: current.toISOString().slice(0, 10),
          dayOrder: dayOrder,
          status: isSunday ? 'H' : 'W',
          reason: isSunday ? 'Sunday' : null
        });
        
        current.setDate(current.getDate() + 1);
      }
      
      return dates;
    };
    
    const dates = getDatesInRange(startDate, endDate);
    
    // Delete existing dates in this range first to avoid duplicates
    await db.query(
      'DELETE FROM academic_calendar WHERE Calendar_Date >= ? AND Calendar_Date <= ?',
      [startDate, endDate]
    );
    
    // Insert all dates
    for (const dateInfo of dates) {
      await db.query(
        `INSERT INTO academic_calendar (Calendar_Date, Day_Order, Status, Reason) 
         VALUES (?, ?, ?, ?)`,
        [dateInfo.date, dateInfo.dayOrder, dateInfo.status, dateInfo.reason]
      );
    }
    
    console.log(`Generated ${dates.length} calendar dates from ${startDate} to ${endDate}`);
  } catch (err) {
    console.error('Error generating academic calendar dates:', err);
    throw err;
  }
};
