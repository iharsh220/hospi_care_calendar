const { Event } = require('../models');

// Get events based on user role
const getUserEvents = async (req, res) => {
    try {
        const user = req.user;
        const userLevel = (user.level || '').trim().toUpperCase();

        // Fetch all active events
        const events = await Event.findAll({
            where: { is_active: true },
            order: [['created_at', 'DESC']]
        });

        // Filter events based on assign_to field
        const filteredEvents = events.filter((event) => {
            const assignTo = event.assign_to || '';

            // If "everyone" is in assign_to, show to all
            if (assignTo.toUpperCase().includes('EVERYONE')) {
                return true;
            }

            // Split assign_to by comma and check if user's level is present
            const assignToList = assignTo
                .split(',')
                .map((item) => item.trim().toUpperCase())
                .filter((item) => item.length > 0);

            return assignToList.includes(userLevel);
        });

        res.json({
            success: true,
            count: filteredEvents.length,
            user_level: user.level,
            data: filteredEvents
        });
    } catch (error) {
        console.error('Get user events error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

module.exports = {
    getUserEvents
};
