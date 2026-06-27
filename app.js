const COURTS = ["Court 1", "Court 2", "Court 3", "Court 4"];
const TIME_SLOTS = [
  "8:00 AM - 10:00 AM",
  "10:00 AM - 12:00 PM",
  "12:00 PM - 2:00 PM",
  "2:00 PM - 4:00 PM",
  "4:00 PM - 6:00 PM",
  "6:00 PM - 8:00 PM",
  "8:00 PM - 10:00 PM",
  "10:00 PM - 11:00 PM"
];
const COURT_RATE = 20;

const page = document.body.dataset.page;

// --- API HELPER ---
const api = {
  async get(endpoint) {
    try {
      const response = await fetch(`http://localhost:3000/api/${endpoint}`);
      return await response.json();
    } catch (error) {
      console.error("API GET Error:", error);
      return null;
    }
  },
  async post(endpoint, data) {
    try {
      const response = await fetch(`http://localhost:3000/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (error) {
      console.error("API POST Error:", error);
      return { success: false, message: "Server connection failed." };
    }
  }
};

// --- UTILITIES ---
function today() {
  return new Date().toISOString().slice(0, 10);
}

function requireUser() {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (!user) window.location.href = "index.html";
  return user;
}

function fillSelect(selectElement, options) {
  if (!selectElement) return;
  selectElement.innerHTML = options.map(option => `<option value="${option}">${option}</option>`).join("");
}

function addMonths(dateValue, months) {
  const date = new Date(dateValue);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}

// --- PAGE INITIALIZATIONS ---

function initAuthPages() {
  if (page === "login") {
    const loginForm = document.getElementById("loginForm");
    loginForm.addEventListener("submit", async event => {
      event.preventDefault();
      const email = document.getElementById("loginEmail").value.trim().toLowerCase();
      const password = document.getElementById("loginPassword").value;
      const loginMessage = document.getElementById("loginMessage");

      const response = await api.post('login', { email, password });
      
      if (response.success) {
        localStorage.setItem("currentUser", JSON.stringify(response.user));
        // Redirect Admin to admin dashboard, regular users to regular dashboard
        if(response.user.role === 'Admin') {
            window.location.href = "admin_dashboard.html";
        } else {
            window.location.href = "dashboard.html";
        }
      } else {
        loginMessage.textContent = response.message || "Invalid email or password.";
      }
    });
  }

  if (page === "register") {
    const registerForm = document.getElementById("registerForm");
    registerForm.addEventListener("submit", async event => {
      event.preventDefault();
      const name = document.getElementById("registerName").value.trim();
      const email = document.getElementById("registerEmail").value.trim().toLowerCase();
      const password = document.getElementById("registerPassword").value;
      const phone = document.getElementById("registerPhone").value.trim();
      const registerMessage = document.getElementById("registerMessage");

      const response = await api.post('register', { name, email, password, phone });

      if (response.success) {
        alert("Registration successful! Please log in.");
        window.location.href = "index.html";
      } else {
        registerMessage.textContent = response.message || "Registration failed.";
      }
    });
  }
}

function initDashboard() {
  const user = requireUser();
  document.getElementById("welcomeName").textContent = user.full_name || user.name || "User";
  document.getElementById("logoutButton").addEventListener("click", logout);
}

async function initProfile() {
  const user = requireUser();
  const profileName = document.getElementById("profileName");
  const profilePhone = document.getElementById("profilePhone");
  const profilePassword = document.getElementById("profilePassword");
  const profileMessage = document.getElementById("profileMessage");

  profileName.value = user.full_name || user.name || "";
  profilePhone.value = user.phone_number || user.phone || "";
  profilePassword.value = user.password || "";

  document.getElementById("profileForm").addEventListener("submit", async event => {
    event.preventDefault();
    try {
      const response = await fetch(`http://localhost:3000/api/users/${user.user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName.value,
          phone: profilePhone.value,
          password: profilePassword.value
        })
      });
      const result = await response.json();

      if (result.success) {
        localStorage.setItem("currentUser", JSON.stringify(result.user));
        profileMessage.textContent = "Profile updated successfully!";
        profileMessage.style.color = "green";
      } else {
        profileMessage.textContent = "Failed to update profile.";
        profileMessage.style.color = "red";
      }
    } catch (error) {
      profileMessage.textContent = "Server error.";
      profileMessage.style.color = "red";
    }
  });
}

async function initMembership() {
  const user = requireUser();
  const membershipStart = document.getElementById("membershipStart");
  const membershipExpiry = document.getElementById("membershipExpiry");
  const membershipType = document.getElementById("membershipType");

  membershipStart.value = today();
  const updateExpiry = () => {
    const months = { Monthly: 1, Quarterly: 3, Yearly: 12 }[membershipType.value];
    membershipExpiry.value = membershipStart.value ? addMonths(membershipStart.value, months) : "";
  };
  
  membershipType.addEventListener("change", updateExpiry);
  membershipStart.addEventListener("change", updateExpiry);
  updateExpiry();

  document.getElementById("membershipForm").addEventListener("submit", async event => {
    event.preventDefault();
    const response = await api.post('memberships', {
      userId: user.user_id,
      type: membershipType.value,
      startDate: membershipStart.value,
      expiryDate: membershipExpiry.value
    });

    const membershipMessage = document.getElementById("membershipMessage");
    if(response.success) {
      membershipMessage.textContent = "Membership application saved successfully.";
      membershipMessage.style.color = "green";
    } else {
      membershipMessage.textContent = "Failed to save membership.";
      membershipMessage.style.color = "red";
    }
  });
}

async function initBooking() {
  const user = requireUser();
  const bookingCourt = document.getElementById("bookingCourt");
  const bookingSlot = document.getElementById("bookingSlot");
  const bookingDate = document.getElementById("bookingDate");
  const bookingMessage = document.getElementById("bookingMessage");

  fillSelect(bookingCourt, COURTS);
  fillSelect(bookingSlot, TIME_SLOTS);
  bookingDate.value = today();

  const memRes = await api.get(`memberships/${user.user_id}`);
  document.getElementById("memberStatus").textContent = memRes?.membership ? memRes.membership.status : "None";
  document.getElementById("memberType").textContent = memRes?.membership ? memRes.membership.membership_type : "None";

  document.getElementById("bookingForm").addEventListener("submit", async event => {
    event.preventDefault();
    
    const [startTime, endTime] = bookingSlot.value.split(" - ");
    const amount = bookingSlot.value.includes("10:00 PM") ? COURT_RATE : COURT_RATE * 2;

    const response = await api.post('bookings', {
      userId: user.user_id,
      courtName: bookingCourt.value,
      date: bookingDate.value,
      startTime: startTime,
      endTime: endTime,
      amount: amount
    });

    if (response.success) {
      localStorage.setItem("pendingPaymentId", response.bookingId);
      window.location.href = "payment.html"; 
    } else {
      bookingMessage.textContent = response.message || "Court is already booked for this slot.";
      bookingMessage.style.color = "red";
    }
  });
}

async function initPayment() {
  const user = requireUser();
  const pendingId = localStorage.getItem("pendingPaymentId");
  const paymentForm = document.getElementById("paymentForm");
  const paymentMessage = document.getElementById("paymentMessage");

  const bookingRes = pendingId 
    ? await api.get(`bookings/${pendingId}`) 
    : await api.get(`bookings/unpaid/${user.user_id}`);

  document.getElementById("paymentDate").value = today();

  if (!bookingRes || !bookingRes.booking) {
    paymentMessage.textContent = "No pending booking found.";
    paymentForm.querySelectorAll("input, select, button").forEach(item => item.disabled = true);
    return;
  }

  const booking = bookingRes.booking;
  document.getElementById("paymentBookingId").value = booking.booking_id;
  document.getElementById("paymentAmount").value = parseFloat(booking.total_price).toFixed(2);
  const statusEl = document.getElementById("paymentStatus");
  statusEl.textContent = "Pending";

  paymentForm.addEventListener("submit", async event => {
    event.preventDefault();
    
    const response = await api.post('payments', {
      bookingId: booking.booking_id,
      method: document.getElementById("paymentMethod").value,
      amount: booking.total_price,
      date: document.getElementById("paymentDate").value
    });

    if (response.success) {
      localStorage.removeItem("pendingPaymentId");
      paymentMessage.textContent = "Payment confirmed successfully.";
      paymentMessage.style.color = "green";
      statusEl.textContent = "Paid";
      setTimeout(() => window.location.href = "history.html", 1500);
    } else {
      paymentMessage.textContent = "Payment processing failed.";
      paymentMessage.style.color = "red";
    }
  });

  document.getElementById("cancelPayment").addEventListener("click", () => {
    localStorage.removeItem("pendingPaymentId");
    window.location.href = "dashboard.html";
  });
}

async function renderAvailability() {
  const court = document.getElementById("availabilityCourt").value;
  const date = document.getElementById("availabilityDate").value;
  const tbody = document.getElementById("availabilityRows");
  
  tbody.innerHTML = "<tr><td colspan='2'>Loading...</td></tr>";

  const response = await api.get(`availability?court=${encodeURIComponent(court)}&date=${date}`);
  const bookedSlots = response.bookedSlots || []; 

  tbody.innerHTML = TIME_SLOTS.map(slot => {
    const status = bookedSlots.includes(slot) ? "Booked" : "Available";
    const statusColor = status === "Booked" ? "red" : "green";
    return `<tr>
              <td>${slot}</td>
              <td style="color: ${statusColor}; font-weight: bold;">${status}</td>
            </tr>`;
  }).join("");
}

function initAvailability() {
  requireUser();
  const availabilityCourt = document.getElementById("availabilityCourt");
  const availabilityDate = document.getElementById("availabilityDate");
  
  fillSelect(availabilityCourt, COURTS);
  availabilityDate.value = today();
  
  document.getElementById("availabilityForm").addEventListener("submit", event => {
    event.preventDefault();
    renderAvailability();
  });
  
  renderAvailability();
}

async function initHistory() {
  const user = requireUser();
  const historyRows = document.getElementById("historyRows");
  const historyEmpty = document.getElementById("historyEmpty");

  const response = await api.get(`history/${user.user_id}`);
  const bookings = response.bookings || [];

  if (!bookings.length) {
    historyEmpty.textContent = "No bookings yet.";
    return;
  }

  historyRows.innerHTML = bookings.map(booking => `
    <tr>
      <td>${booking.booking_id}</td>
      <td>${booking.court_name}</td>
      <td>${new Date(booking.booking_date).toISOString().slice(0, 10)}</td>
      <td>${booking.start_time} - ${booking.end_time}</td>
      <td>${booking.status}</td>
      <td>${booking.payment_status || 'Pending'}</td>
    </tr>
  `).join("");
}

async function initAdminDashboard() {
  requireUser(); 
  document.getElementById("adminLogout").addEventListener("click", logout);

  const usersList = document.getElementById("adminUsersList");
  const bookingsList = document.getElementById("adminBookingsList");

  async function loadUsers() {
    const res = await api.get('admin/users');
    if (res && res.users) {
      usersList.innerHTML = res.users.map(u => `
        <tr>
          <td>${u.user_id}</td>
          <td>${u.full_name}</td>
          <td>${u.email}</td>
          <td>${u.phone_number}</td>
        </tr>
      `).join("");
    }
  }

  async function loadBookings() {
    const search = document.getElementById("searchName").value;
    const status = document.getElementById("filterStatus").value;
    const date = document.getElementById("filterDate").value;

    const query = new URLSearchParams({ search, status, date }).toString();
    const res = await api.get(`admin/bookings?${query}`);

    if (res && res.bookings) {
  bookingsList.innerHTML = res.bookings.map(b => `
    <tr>
      <td>${b.booking_id}</td>
      <td>${b.full_name}</td>
      <td>${b.court_name}</td>
      <td>${new Date(b.booking_date).toISOString().slice(0,10)}</td>
      <td>${b.start_time} - ${b.end_time}</td>
      <td><strong>${b.status}</strong></td>
      <td>
        <button class="btn-approve" onclick="handleBookingAction(${b.booking_id}, 'Approved')">Approve</button>
        <button class="btn-reject" onclick="handleBookingAction(${b.booking_id}, 'Rejected')">Reject</button>
      </td>
    </tr>
  `).join("");
   
  }

  document.getElementById("btnSearch").addEventListener("click", loadBookings);

  loadUsers();
  loadBookings();
}

// Exposed globally for inline HTML onclick handlers
window.handleBookingAction = async function(bookingId, action) {
  if (!confirm(`Are you sure you want to mark this booking as ${action}?`)) return;

  try {
    const response = await fetch(`http://localhost:3000/api/admin/bookings/${bookingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: action, remarks: `Action taken by Admin` })
    });
    
    const result = await response.json();
    if (result.success) {
      alert(`Booking ${action} successfully.`);
      window.location.reload(); 
    } else {
      alert("Failed to update booking status.");
    }
  } catch (error) {
    alert("Server error.");
  }
}

// --- ROUTER ---
// Make sure your HTML <body> tags have the correct data-page="..." attribute! [cite: 151]
initAuthPages();
if (page === "dashboard") initDashboard();
if (page === "profile") initProfile(); 
if (page === "membership") initMembership();
if (page === "booking") initBooking();
if (page === "payment") initPayment();
if (page === "availability") initAvailability();
if (page === "history") initHistory();
if (page === "admin") initAdminDashboard();