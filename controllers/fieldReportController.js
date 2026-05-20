const { Op, fn, col } = require('sequelize');
const { Organogram, EventAssignment, Event } = require('../models');
const { activeUserWhere, ensureAssignmentsForMonth } = require('../services/assignmentService');

// ─────────────────────────────────────────────────────────
// GET /field/reports
// Hierarchy:
//   ZM  → sees all RM and KAM under their zm_sapcode
//   RM  → sees all KAM under their rm_sapcode
//   KAM → sees only their own report
// ─────────────────────────────────────────────────────────
const getReports = async (req, res) => {
  try {
    const currentUser = req.fieldUser;
    const level = currentUser.level;
    const sapCode = currentUser.sap_code;

    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const search = req.query.search || '';
    const statusFilter = req.query.status || 'all';
    await ensureAssignmentsForMonth(month, year);

    // ── Build WHERE clause for subordinate users ──
    let subordinateWhere = activeUserWhere();

    if (level === 'ZM') {
      // ZM sees everyone whose zm_sapcode matches this ZM's sap_code
      subordinateWhere.zm_sapcode = sapCode;
    } else if (level === 'RM') {
      // RM sees AM/KAM users whose rm_sapcode matches this RM's sap_code
      subordinateWhere.rm_sapcode = sapCode;
    } else {
      subordinateWhere.id = currentUser.id;
    }

    // ── Search filter ──
    if (search) {
      subordinateWhere[Op.or] = [
        { emp_name: { [Op.like]: `%${search}%` } },
        { emp_code: { [Op.like]: `%${search}%` } },
        { division: { [Op.like]: `%${search}%` } }
      ];
    }

    // ── Fetch subordinates with their assignments ──
    const subordinates = await Organogram.findAll({
      where: subordinateWhere,
      include: [{
        model: EventAssignment,
        as: 'assignments',
        where: { month, year },
        required: false,
        include: [{ model: Event, as: 'event', attributes: ['name', 'type', 'event_date'] }]
      }],
      order: [
        [fn('FIELD', col('level'), 'ZM', 'RM', 'AM', 'KAM', 'BDM - Government Account')],
        ['emp_name', 'ASC']
      ]
    });

    const totalActiveEvents = await Event.count({ where: { is_active: true } });

    // ── Build report rows ──
    let reports = subordinates.map(u => {
      const assignments = u.assignments || [];
      const completed = assignments.filter(a => a.status === 'done').length;
      const pending = assignments.filter(a => a.status !== 'done').length;
      const hasCarryForward = assignments.some(a => a.is_carry_forward);
      const completionPercent = assignments.length > 0
        ? Math.round((completed / assignments.length) * 100) : 0;

      const lastActive = assignments
        .filter(a => a.completed_on)
        .sort((a, b) => new Date(b.completed_on) - new Date(a.completed_on))[0];

      let reportStatus = 'incomplete';
      if (hasCarryForward) reportStatus = 'carry';
      else if (pending === 0 && completed > 0) reportStatus = 'complete';

      const events = assignments.map(a => {
        const e = a.event;
        return {
          id: a.id,
          event_name: e ? e.name : 'Unknown',
          type: e ? e.type : 'unknown',
          status: a.status,
          due_date: e ? e.event_date : null,
          completed_on: a.completed_on || null,
          proof_image_url: a.proof_image_url || null
        };
      });

      return {
        id: u.id,
        sap_code: u.sap_code,
        emp_code: u.emp_code,
        emp_name: u.emp_name,
        level: u.level,
        division: u.division,
        hq: u.hq,
        emailid: u.emailid,
        mobileno: u.mobileno,
        doj: u.doj,
        am_sapcode: u.am_sapcode,
        rm_sapcode: u.rm_sapcode,
        zm_sapcode: u.zm_sapcode,
        completed_events: completed,
        pending_events: pending,
        total_events: assignments.length || totalActiveEvents,
        completion_percent: completionPercent,
        has_carry_forward: hasCarryForward,
        last_active: lastActive
          ? new Date(lastActive.completed_on).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          : null,
        status: reportStatus,
        events
      };
    });

    // ── Apply status filter ──
    if (statusFilter !== 'all') {
      reports = reports.filter(r => r.status === statusFilter);
    }

    // ── Summary ──
    const totalSubordinates = subordinates.length;
    const fullyComplete = reports.filter(r => r.status === 'complete').length;
    const behindIncomplete = reports.filter(r => r.status === 'incomplete').length;
    const carryForwards = reports.filter(r => r.status === 'carry').length;

    // ── Organogram tree ──
    let organogram = null;
    if (level === 'ZM') {
      const rms = reports.filter(r => r.level === 'RM');
      const kams = reports.filter(r => ['AM', 'KAM', 'BDM - Government Account'].includes(r.level));
      organogram = {
        zm: {
          emp_code: currentUser.emp_code,
          emp_name: currentUser.emp_name,
          level: currentUser.level
        },
        rms: rms.map(r => ({
          emp_code: r.emp_code,
          emp_name: r.emp_name,
          level: r.level,
          completion_percent: r.completion_percent,
          status: r.status,
          kam_count: kams.filter(k => String(k.rm_sapcode) === String(r.sap_code || r.emp_code)).length
        })),
        kams: kams.map(k => ({
          emp_code: k.emp_code,
          emp_name: k.emp_name,
          level: k.level,
          rm_sapcode: k.rm_sapcode,
          completion_percent: k.completion_percent,
          status: k.status
        }))
      };
    } else if (level === 'RM') {
      const kams = reports.filter(r => ['AM', 'KAM', 'BDM - Government Account'].includes(r.level));
      organogram = {
        rm: {
          emp_code: currentUser.emp_code,
          emp_name: currentUser.emp_name,
          level: currentUser.level
        },
        kams: kams.map(k => ({
          emp_code: k.emp_code,
          emp_name: k.emp_name,
          level: k.level,
          completion_percent: k.completion_percent,
          status: k.status
        }))
      };
    }

    res.json({
      success: true,
      month,
      year,
      viewer: {
        id: currentUser.id,
        emp_code: currentUser.emp_code,
        emp_name: currentUser.emp_name,
        level: currentUser.level,
      },
      summary: {
        total_subordinates: totalSubordinates,
        fully_complete: fullyComplete,
        behind_incomplete: behindIncomplete,
        carry_forwards: carryForwards
      },
      organogram,
      reports
    });
  } catch (err) {
    console.error('Reports error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getReports };
