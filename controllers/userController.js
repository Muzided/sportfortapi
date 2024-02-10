import { User } from "../models/userModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { Ground } from "../models/groundModel.js";
import { Booking } from "../models/bookingModel.js";
import { PendingSlot} from "../models/pendingSlot.js"

//*************** user registration ***************//

export const userSignup = async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(403).send({
                message: "User already exists",
                success: false,
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            username: username,
            email: email,
            password: hashedPassword,
        });

        await user.save(); //save user to db

        const token = jwt.sign(
            { email, role: 'user' },
            process.env.SECRET,
            { expiresIn: '1d' }
        );

        return res.status(201).send({
            message: "User created",
            success: true,
            user,
            token,
        })
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            message: "Error creating account",
            success: false,
            error,
        });
    }
}

//*************** user login ***************//
export const userLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send({
                message: "User not found",
                success: false,
            });
        }

        //compare password
        const matchPassword = bcrypt.compare(password, user.password);
        if (!matchPassword) {
            return res.status(403).send({
                message: "Incorrect email or password",
                success: false,
            });
        }

        //create token and login
        const token = jwt.sign(
            { email, role: 'user' },
            process.env.SECRET,
            { expiresIn: '1d' }
        );
        res.status(200).send({
            message: "Logged in",
            success: true,
            user,
            token,
        });

    } catch (error) {
        console.log(error);
        return res.status(500).send({
            message: "Something went wrong",
            success: false,
            error,
        });
    }
}

//*************** display grounds for the user ***************//
export const getGrounds = async (req, res) => {
    try {
        const grounds = await Ground.find({ published: true });
        res.status(200).send({
            success: true,
            grounds,
        });
    } catch (error) {
        console.log(error);
        return res.status(400).send({
            message: "No grounds listed",
            success: false,
            error,
        });
    }
}

//*************** get ground by id ***************//
export const getGroundById = async (req, res) => {
    try {
        const groundId = req.params.id;
        const ground = await Ground.findById(groundId);
        res.status(200).send({
            success: true,
            ground,
        });
    } catch (error) {
        console.log(error);
        return res.status(404).send({
            message: "ground not found",
            success: false,
            error,
        });
    }
}

//*************** book time slot ***************//
export const bookTimeSlot = async (req, res) => {
    try {
        const groundId = req.params.id;
        const ground = await Ground.findById(groundId);

        if (!ground) {
            return res.status(400).send({
                message: "Ground not found",
                success: false,
            });
        }

        //date and timeslot validations
        const { date, timeSlot } = req.body;

        const isValidDate = (date) => {
            const currentDate = new Date();
            return date instanceof Date && date > currentDate;
        };
        // Parse the date string to a JavaScript Date object
        const parsedDate = new Date(date);
        console.log(parsedDate);

        if (!isValidDate(parsedDate)) {
            return res.status(400).send({
                message: "Invalid date provided",
                success: false,
            });
        }

        const isValidTimeSlot = (timeSlot, availableSlots) => {
            return availableSlots.includes(timeSlot);
        };
        if (!isValidTimeSlot(timeSlot, ground.availableSlots)) {
            return res.status(400).send({
                message: "Selected time slot is not available",
                success: false,
            });
        }

        //check if time slot is already booked
        if (ground.bookings.some(booking => booking.date.getTime() === parsedDate.getTime() && booking.timeSlot === timeSlot)) {
            return res.status(400).send({
                message: "Selected time slot is already booked",
                success: false,
            });
        }

        // user validation
        const user = await User.findOne({ email: req.user.email });
        if (!user) {
            return res.status(403).send({
                message: "User not found",
                success: false,
            });
        }
        const booking = new Booking({
            user: user.username,
            ground: ground.ground_name,
            date: parsedDate,
            timeSlot,
        });
        await booking.save();

        //update and save ground's booking array
        ground.bookings.push(booking);
        await ground.save();

        //update and save user's booking array
        user.bookings.push(booking);
        await user.save();

        res.status(200).send({
            message: "Time slot booked successfully",
            success: true,
            booking,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            message: "something went wrong",
            success: false,
            error,
        });
    }
}

//*************** remove book time slot ***************//
export const removeBookTimeSlot = async (req, res) => {
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

        // Check if the user requesting the removal is the owner of the booking
        const user = await User.findOne({ email: req.user.email });
        if (!user || user.username !== booking.user) {
            return res.status(403).send({
                message: "Unauthorized to remove this booking",
                success: false,
            });
        }

        // Remove the booking from the ground's bookings array
        const ground = await Ground.findOne({ ground_name: booking.ground });
        ground.bookings = ground.bookings.filter(b => b._id.toString() !== bookingId);

        // Remove the booking from the user's bookings array
        user.bookings = user.bookings.filter(b => b._id.toString() !== bookingId);

        // Remove the booking from the Booking collection
        await Booking.findByIdAndRemove(bookingId);

        // Save the updated ground and user documents
        await ground.save();
        await user.save();

        res.status(200).send({
            message: "Booking removed successfully",
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
}

//****************sport filter on grounds*************/
export const getSportGround = async (req, res) => {
   
    const { sport } = req.body;

    try {
        // Update user's history array with the selected sport
        const user = await User.findOneAndUpdate(
            { email: req.user.email },
            { $addToSet: { history: sport } }, // Using $addToSet to avoid duplicate entries
            { new: true }
        );

        // Find grounds based on the selected sport
        const grounds = await Ground.find({ sports: sport });

        res.json({ user, grounds });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
//*************** get bookings by user ***************//
export const getBookings = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.user.email }).populate('bookings');
        if (user) {
            res.status(200).send({
                bookings: user.bookings || [],
                success: true,
            });
        } else {
            return res.status(400).send({
                message: "User not found",
                success: false,
            });
        }
    } catch (error) {
        console.log(error);
        return res.status(400).send({
            message: "No bookings found",
            success: false,
            error,
        });
    }
}

// Function to book a slot and add it to the pending table
export const bookSlot = async (req, res) => {
    try {
        const { groundId, startTime, endTime } = req.body;
        isBooked = true;

        const ground = await Ground.findById(groundId);

        if (!ground) {
            return res.status(404).json({ message: 'Ground not found' });
        }

        const newPendingSlot = new PendingSlot({
            ground: ground._id,
            startTime,
            endTime,
            isBooked
        });

        await newPendingSlot.save();

        res.status(201).json({ message: 'Slot booking request sent for approval', slot: newPendingSlot });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getApiKey = async (req, res) => {
    try {
        const key = process.env.API_KEY;
        if (key) {
            res.status(200).send({
                success: true,
                key,
            });
        } else {
            return res.status(400).send({
                message: "No key found",
                success: false,
            });
        }
    } catch (error) {
        console.log(error);
        return res.status(400).send({
            message: "No API key found",
            success: false,
            error,
        });
    }
}

//****************sport filter on grounds*************/
export const getAllSports = async (req, res) => {
    try {
        const allGrounds = await Ground.find();
        const allSports = new Set();

        // Iterate through all grounds and collect unique sports
        allGrounds.forEach((ground) => {
            ground.sports.forEach((sport) => {
                // Convert sport to lowercase for case-insensitivity
                const lowercaseSport = sport.toLowerCase();
                allSports.add(lowercaseSport);
            });
        });

        // Convert Set to an array before sending the response
        const uniqueSports = Array.from(allSports);

        res.json({ sports: uniqueSports });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export const getGroundsByUserHistory = async (req, res) => {
    try {
        const userId = req.user.id; // Assuming you have access to the user ID from the request

        // Find the user by ID
        const user = await User.findOne({ email: req.user.email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Get grounds based on the user's history
        const grounds = await Ground.find({ sports: { $in: user.history } });

        res.status(200).json({
            message: "Grounds fetched successfully based on user's history",
            grounds,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
