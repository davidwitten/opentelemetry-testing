const express = require("express");
const router = express.Router();

const Adb = {
    "yeast": {
        quantity: 11,
        price: 5
    },
    "egg": {
        quantity: 15,
        price: 4
    },
    "milk": {
        quantity:4,
        price:3
    }
}

router.get("/", (req, res, next) => {
    var result = {}
    if (req.query.ingredient in Adb) {
        result = Adb[req.query.ingredient];
    }
    res.send({...result, vendor: "vendor A"});
});

module.exports = router;