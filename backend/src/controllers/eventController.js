import {
  addParticipantToEvent,
  createEvent,
  getDashboardMetrics,
  getEventParticipants,
  listEvents,
  loadOfficialEvents,
  removeParticipantFromEvent
} from "../services/eventService.js";

export async function createEventHandler(req, res, next) {
  try {
    const event = await createEvent(req.body);
    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
}

export async function listEventsHandler(_req, res, next) {
  try {
    const events = await listEvents();
    res.json(events);
  } catch (error) {
    next(error);
  }
}

export async function loadOfficialEventsHandler(_req, res, next) {
  try {
    const events = await loadOfficialEvents();
    res.json({
      message: "Official sports meet events loaded successfully.",
      events
    });
  } catch (error) {
    next(error);
  }
}

export async function metricsHandler(_req, res, next) {
  try {
    const metrics = await getDashboardMetrics();
    res.json(metrics);
  } catch (error) {
    next(error);
  }
}

export async function listParticipantsHandler(req, res, next) {
  try {
    const rows = await getEventParticipants(Number(req.params.id));
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

export async function addParticipantHandler(req, res, next) {
  try {
    const participant = await addParticipantToEvent(Number(req.params.id), Number(req.body.student_id));
    res.status(201).json(participant);
  } catch (error) {
    next(error);
  }
}

export async function removeParticipantHandler(req, res, next) {
  try {
    await removeParticipantFromEvent(Number(req.params.id), Number(req.params.participantId));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
