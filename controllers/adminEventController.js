const { Event } = require('../models');

// Create a new event
const createEvent = async (req, res) => {
  try {
    const { event_name, description, event_type, event_date, assign_to } = req.body;
    
    // Validate required fields
    if (!event_name || !event_type) {
      return res.status(400).json({
        success: false,
        message: 'event_name and event_type are required'
      });
    }

    // Validate event_type
    const validEventTypes = ['monthly', 'di_monthly', 'quarterly', 'half_yearly', 'yearly'];
    if (!validEventTypes.includes(event_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event_type. Must be one of: monthly, di_monthly, quarterly, half_yearly, yearly'
      });
    }

    // For yearly events, event_date is required
    if (event_type === 'yearly' && !event_date) {
      return res.status(400).json({
        success: false,
        message: 'event_date is required for yearly events'
      });
    }

    // For non-yearly events, event_date is optional
    // If provided for non-yearly events, it will be stored but not validated

    const event = await Event.create({
      event_name,
      description,
      event_type,
      event_date: event_type === 'yearly' ? event_date : null,
      assign_to: assign_to || '',
      is_active: true
    });

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all events
const getAllEvents = async (req, res) => {
  try {
    const events = await Event.findAll({
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete an event
const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    await event.destroy();

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update an event
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { event_name, description, event_type, event_date, assign_to, is_active } = req.body;

    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Validate event_type if provided
    if (event_type) {
      const validEventTypes = ['monthly', 'di_monthly', 'quarterly', 'half_yearly', 'yearly'];
      if (!validEventTypes.includes(event_type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid event_type. Must be one of: monthly, di_monthly, quarterly, half_yearly, yearly'
        });
      }
    }

    // For yearly events, event_date is required
    if (event_type === 'yearly' && !event_date) {
      return res.status(400).json({
        success: false,
        message: 'event_date is required for yearly events'
      });
    }

    // Update event
    await event.update({
      event_name: event_name || event.event_name,
      description: description || event.description,
      event_type: event_type || event.event_type,
      event_date: event_type === 'yearly' ? event_date : null,
      assign_to: assign_to || event.assign_to,
      is_active: is_active !== undefined ? is_active : event.is_active
    });

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: event
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  createEvent,
  getAllEvents,
  deleteEvent,
  updateEvent
};