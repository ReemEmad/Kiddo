const express = require("express");
const router = express.Router();

const { body } = require("express-validator");

const validateRequest = require("../middlewares/validateRequest");
const authenticate = require("../middlewares/authentication");
const authorize = require("../middlewares/authorize");
const Buyer = require("../models/buyer");
const Product = require("../models/product");

const { login } = require("../helpers/helper");

router.post("/register", async (req, res) => {
	const { username, password, email, dateOfBirth, phone, address } = req.body;
	const buyer = new Buyer({
		username,
		password,
		email,
		dateOfBirth,
		phone,
		address,
	});

	await buyer.save();
	const token = await buyer.generateToken();

	res.status(201).json({
		message: "Buyer registered successfully",
		buyer,
		token,
		type: "Buyer",
	});
});

router.post(
	"/login",
	validateRequest([
		body("username").exists().withMessage("Username is required"),
		body("password").exists().withMessage("Password is required"),
	]),
	login(Buyer)
);

//get latest Buyer’s bought products
router.get(
	"/products/:id",
	authenticate,
	authorize("Buyer"),
	async (req, res) => {
		const totalNumOfProducts = await Product.countDocuments({
			buyer: req.params.id,
		});
		if (totalNumOfProducts === 0)
			return res.status(400).json({ message: "You didn't buy any product" });

		const products = await Product.find({ buyer: req.params.id })
			.sort({ _id: -1 })
			.skip((parseInt(req.query.pageNum) - 1) * parseInt(req.query.size))
			.limit(parseInt(req.query.size))
			.populate({
				path: "post",
				populate: "commentsTotal authorKid likes",
			});
		res.send({ products, totalNumOfProducts });
	}
);

//get Buyer by id
router.get("/:id", async (req, res) => {
	const buyer = await Buyer.findById(req.params.id);
	if (!buyer) return res.status(400).json({ message: "buyer doesn't exist" });

	res.json({ user: buyer });
});

module.exports = router;
