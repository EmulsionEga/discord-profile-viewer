const express = require('express');
const passport = require('passport');
const router = express.Router();

// Discord login route
router.get('/discord', passport.authenticate('discord'));

// Discord callback route
router.get('/discord/callback', 
    passport.authenticate('discord', {
        failureRedirect: '/'
    }),
    (req, res) => {
        res.redirect('/profile');
    }
);

// Logout route
router.get('/logout', (req, res) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

module.exports = router;
