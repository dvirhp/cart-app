import React, { useState } from "react";
import { joinFamily } from "../../api/familyApi";

function JoinFamilyPage({ token }) {
  const [code, setCode] = useState("");       // Family join code input
  const [message, setMessage] = useState(""); // Feedback message from the server

  // Handle form submit to join a family
  async function handleJoin(e) {
    e.preventDefault();
    try {
      const res = await joinFamily(code, token);
      setMessage(res.message || res.error || "Request sent");
    } catch (err) {
      setMessage("Failed to join family");
    }
    setCode("");
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Join a Family</h2>

      <form onSubmit={handleJoin} style={{ marginTop: 16 }}>
        <input
          type="text"
          placeholder="Enter family code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <button type="submit" style={{ marginLeft: 8 }}>
          Join
        </button>
      </form>

      {message && (
        <p style={{ marginTop: 12, color: "blue" }}>{message}</p>
      )}
    </div>
  );
}

export default JoinFamilyPage;
