import React, { useState, useEffect } from "react";
import { sendInvite, getFamily } from "../../api/familyApi";

function FamilyPage({ familyId, token }) {
  const [family, setFamily] = useState(null);     // Holds the family data
  const [email, setEmail] = useState("");         // Email input for invitation
  const [message, setMessage] = useState("");     // Success or error message

  // Load family info when component mounts or props change
  useEffect(() => {
    async function loadFamily() {
      try {
        const data = await getFamily(familyId, token);
        setFamily(data);
      } catch (err) {
        setMessage("Failed to load family data");
      }
    }
    loadFamily();
  }, [familyId, token]);

  // Handle invitation form submit
  async function handleInvite(e) {
    e.preventDefault();
    try {
      const res = await sendInvite(familyId, email, token);
      setMessage(res.message || res.error || "Invite sent");
    } catch (err) {
      setMessage("Failed to send invite");
    }
    setEmail("");
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>My Family</h2>

      {family ? (
        <div>
          <h3>{family.name}</h3>
          <ul>
            {family.members.map((member) => (
              <li key={member._id}>{member.email}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p>Loading...</p>
      )}

      <form onSubmit={handleInvite} style={{ marginTop: 16 }}>
        <input
          type="email"
          placeholder="Enter email to invite"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" style={{ marginLeft: 8 }}>
          Send Invite
        </button>
      </form>

      {message && (
        <p style={{ marginTop: 12, color: "blue" }}>{message}</p>
      )}
    </div>
  );
}

export default FamilyPage;
