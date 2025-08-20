const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/requireAuth"); // Auth middleware
const Invite = require("../models/Invite");
const Family = require("../models/Family");
const User = require("../models/User");
const { sendMail } = require("../utils/mailer");
const crypto = require("crypto");

/**
 * Send invitation email to join family
 */
router.post("/:id/invite", requireAuth, async (req, res) => {
  try {
    const { email } = req.body;
    const family = await Family.findById(req.params.id);
    if (!family) return res.status(404).json({ error: "Family not found" });

    const code = crypto.randomBytes(3).toString("hex"); // Short invite code
    const invite = await Invite.create({
      familyId: family._id,
      email,
      code,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60), // Expires after 1 hour
    });

    // Send invitation email
    await sendMail({
      to: email,
      subject: "Cart – Family Invitation",
      html: `<p>You have been invited to join the family <b>${family.name}</b></p>
             <p>Your invitation code: <b>${code}</b></p>
             <p>The code is valid for one hour only.</p>`,
    });

    res.json({ message: "Invitation sent", inviteId: invite._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Accept invitation using code
 */
router.post("/join", requireAuth, async (req, res) => {
  try {
    const { code } = req.body;
    const invite = await Invite.findOne({
      code,
      used: false,
      expiresAt: { $gt: new Date() },
    });
    if (!invite) return res.status(400).json({ error: "Invalid or expired invite" });

    const family = await Family.findById(invite.familyId);
    if (!family) return res.status(404).json({ error: "Family not found" });

    // Add user to the family if not already a member
    if (!family.members.includes(req.user.id)) {
      family.members.push(req.user.id);
      await family.save();
      await User.findByIdAndUpdate(req.user.id, { familyId: family._id });
    }

    // Mark invite as used
    invite.used = true;
    await invite.save();

    res.json({ message: "Joined family successfully", family });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
