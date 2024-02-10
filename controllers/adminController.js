import { Admin } from "../models/adminModel.js";
import { Ground } from "../models/groundModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { Booking } from "../models/bookingModel.js";

//*************** admin registration ***************//
export const createAdmin = async (req, res) => {
    const { username, email, password } = req.body;
    try {
        //validation for existing admin
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).send({
                message: 'Admin already exists',
                success: false,
            });
        }

        //hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        //saving admin to db
        const admin = new Admin({
            username: username,
            email: email,
            password: hashedPassword,
        });
        await admin.save();

        const token = jwt.sign({ email, role: 'admin' }, process.env.SECRET, { expiresIn: '1d' }); //created this token so that user can login upon signing up
        return res.status(200).send({
            message: "Admin created",
            success: true,
            admin,
            token,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            message: "Error registering admin",
            success: false,
            error,
        });
    }
}

//*************** admin login ***************//
export const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(400).send({
                message: "user not found",
                success: false,
            });
        }

        //compare password
        const matchPassword = await bcrypt.compare(password, admin.password);
        if (!matchPassword) {
            return res.status(401).send({
                message: "Incorrect password",
                success: false,
            });
        }

        //create token and login
        const token = jwt.sign({ email, role: "admin" }, process.env.SECRET, { expiresIn: '1d' });
        res.status(200).send({
            message: "login successful",
            success: true,
            token,
            admin,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            message: "Error logging in",
            success: false,
            error,
        });
    }
}

//*************** create ground ***************//
export const createGround = async (req, res) => {
    try {
        
        const newGround = req.body;
        const ground = new Ground(newGround);
        await ground.save();
        res.status(200).send({
            message: "Ground creation successful",
            success: true,
            ground,
            groundId: ground.id,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            message: "error creating ground",
            success: false,
            error,
        });
    }
}

//*************** get all ground details ***************//
export const getAllGrounds = async (req, res) => {
    const{admin_name} = req.body
    try {
        const grounds = await Ground.find({ admin_name: admin_name});
        res.status(200).send({
            success: true,
            grounds,
        });
    } catch (error) {
        console.log(error);
        return res.status(400).send({
            message: "No grounds added",
            success: false,
            error,
        });
    }
}
//*************** fetch ground by id ***************//
export const fetchGroundById = async (req, res) => {
    try {
        const groundId = req.params.id;
        const ground = await Ground.findById(groundId);
        res.status(201).send({
            success: true,
            ground,
        });
    } catch (error) {
        console.log(error);
        return res.status(400).send({
            message: "ground not found",
            success: false,
            error,
        });
    }
}
//*************** update ground details ***************//
export const updateGround = async (req, res) => {
    try {
        let updateGround;
        updateGround = await Ground.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true },
        );
        if (!updateGround) {
            return res.status(404).send({
                message: "ground not found",
                success: false,
            });
        }
        res.status(201).send({
            message: "Ground updated",
            success: true,
            ground: updateGround,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            message: "error updating",
            success: false,
            error,
        });
    }
}

//*************** delete ground details ***************//
export const deleteGround = async (req, res) => {
    try {
        const groundId = req.params.id;
        const ground = await Ground.findByIdAndDelete(groundId);
        if (!ground) {
            return res.status(400).send({
                message: "ground not found",
                success: false,
            });
        }
        res.status(200).send({
            message: "Ground deleted",
            success: true,
            ground,
        });
    } catch (error) {
        console.log(error);
        return res.status(400).send({
            message: "Error deleting ground details",
            success: false,
            error,
        });
    }
}

//*************** get all bookings ***************//
export const getBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({});
        res.status(200).send({
            success: true,
            bookings,
        });
    } catch (error) {
        console.log(error);
        return res.status(400).send({
            message: "No bookings found",
            success: false,
            error,
        });
    }
}

//*************** Admin Cancel Booked Time Slot ***************//
export const adminCancelBookedTimeSlot = async (req, res) => {
    try {
        const bookingId = req.params.id;

        // Check if the booking ID is provided
        if (!bookingId) {
            return res.status(400).send({
                message: "Booking ID not provided",
                success: false,
            });
        }

        // Find the booking by ID
        const booking = await Booking.findById(bookingId);

        // Check if the booking exists
        if (!booking) {
            return res.status(400).send({
                message: "Booking not found",
                success: false,
            });
        }

        // Check if the user making the request has admin privileges (customize this based on your admin authentication)
        const isAdmin = req.user.isAdmin; // Assuming you have an 'isAdmin' field in your user model

        if (!isAdmin) {
            return res.status(403).send({
                message: "Unauthorized. Only admin can cancel bookings.",
                success: false,
            });
        }

        // Remove the booking from the ground's bookings array
        const ground = await Ground.findOne({ ground_name: booking.ground });
        ground.bookings = ground.bookings.filter(b => b._id.toString() !== bookingId);

        // Save the updated ground document
        await ground.save();

        // Remove the booking from the user's bookings array
        const user = await User.findOne({ username: booking.user });
        user.bookings = user.bookings.filter(b => b._id.toString() !== bookingId);

        // Save the updated user document
        await user.save();

        // Mark the booking as canceled (you might want to add a 'canceled' field to your Booking model)
        booking.canceled = true;
        await booking.save();

        res.status(200).send({
            message: "Booking canceled by admin successfully",
            success: true,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            message: "Something went wrong",
            success: false,
            error,
        });
    }
};

