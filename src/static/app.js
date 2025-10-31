document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper: escape HTML to avoid accidental injection
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (s) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s])
    );
  }

  // Helper: generate initials (used in small badge)
  function getInitials(name) {
    if (!name) return "";
    // try to split on common separators (space, @, dot, underscore, hyphen)
    const parts = name.split(/[\s@._-]+/).filter(Boolean);
    if (parts.length === 0) return "";
    const first = parts[0][0] || "";
    const second = (parts[1] && parts[1][0]) || "";
    return (first + second).toUpperCase();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and previous items
      activitiesList.innerHTML = "";

      // Reset select options (keep placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants markup
        const participants = Array.isArray(details.participants) ? details.participants : [];
        let participantsHtml = "";
        if (participants.length === 0) {
          participantsHtml = `<p class="no-participants">No participants yet</p>`;
        } else {
          participantsHtml = `<ul class="participants-list">` +
            participants
              .map((p) => {
                const safeName = escapeHtml(p);
                const initials = escapeHtml(getInitials(p));
                // Include a delete button that will unregister the participant when clicked
                return `<li>
                          <span class="participant-badge">${initials}</span>
                          <span class="participant-name">${safeName}</span>
                          <button class="participant-delete" data-activity="${escapeHtml(name)}" data-email="${escapeHtml(p)}" title="Remove participant">✖</button>
                        </li>`;
              })
              .join("") +
            `</ul>`;
        }

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>

          <div class="participants-section">
            <h5>Participants</h5>
            ${participantsHtml}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities list so the newly registered participant appears immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Delegated click handler to catch participant delete button clicks
  activitiesList.addEventListener("click", async (event) => {
    const btn = event.target.closest(".participant-delete");
    if (!btn) return;

    const activity = btn.dataset.activity;
    const email = btn.dataset.email;
    if (!activity || !email) return;

    // Optionally, confirm with the user
    const confirmMsg = `Unregister ${email} from ${activity}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const resp = await fetch(`/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
      });

      const result = await resp.json();

      if (resp.ok) {
        messageDiv.textContent = result.message || "Unregistered participant";
        messageDiv.className = "success";
        messageDiv.classList.remove("hidden");
        // Refresh activities list to reflect removal
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "Failed to unregister participant";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
      }

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      console.error("Error unregistering participant:", error);
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
    }
  });

  // Initialize app
  fetchActivities();
});
