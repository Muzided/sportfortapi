import express from "express";
import { bookTimeSlot, getSportGround, getGroundsByUserHistory,getAllSports, getApiKey, removeBookTimeSlot, getBookings, bookSlot, getGroundById, getGrounds, userLogin, userSignup } from "../controllers/userController.js";
import { authenticateJWT } from "../utils/jwtAuth.js";

const router = express.Router();

router.post('/signup', userSignup);
router.post('/login', userLogin);
router.get('/grounds', getGrounds);
router.post("/bookslot", bookSlot);
router.post('/searchground',authenticateJWT, getSportGround)
router.get('/sportsNames', getAllSports)
router.get('/ground/:id', getGroundById);

router.get('/recomendation',authenticateJWT, getGroundsByUserHistory);
router.post('/book-slot/:id', authenticateJWT, bookTimeSlot);
router.post('/remove-slot/:id', authenticateJWT, removeBookTimeSlot);
router.get('/bookings', authenticateJWT, getBookings);
router.get('/api-key', getApiKey);

export default router;