import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  getDatabase,
  get,
  onValue,
  push,
  ref,
  serverTimestamp,
  set
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

"use strict";

const firebaseConfig = {
  apiKey: "AIzaSyAJ6oo2sDlhAOY_Z-igLKopxocbt8w7-GQ",
  authDomain: "coupleverse-5af32.firebaseapp.com",
  databaseURL: "https://coupleverse-5af32-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "coupleverse-5af32",
  storageBucket: "coupleverse-5af32.firebasestorage.app",
  messagingSenderId: "720450290648",
  appId: "1:720450290648:web:5ab2c57ac2ef44a6baa8ad",
  measurementId: "G-09HVHYS2B4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

const $ = (id) => document.getElementById(id);

const homeScreen = $("homeScreen");
const dashboardScreen = $("dashboardScreen");
const createRoomBtn = $("createRoomBtn");
const showJoinBtn = $("showJoinBtn");
const joinBox = $("joinBox");
const joinRoomBtn = $("joinRoomBtn");
const roomCodeInput = $("roomCodeInput");
const roomCodeText = $("roomCodeText");
const homeMessage = $("homeMessage");
const leaveRoomBtn = $("leaveRoomBtn");
const themeBtn = $("themeBtn");

const chatInput = $("chatInput");
const chatMessages = $("chatMessages");
const sendMessageBtn = $("sendMessageBtn");
const chatNote = document.querySelector("#chatPanel .note");

const videoUrlInput = $("videoUrlInput");
const loadVideoBtn = $("loadVideoBtn");
const videoFrame = $("videoFrame");
const videoWrap = $("videoWrap");
const videoMessage = $("videoMessage");

const newQuestionBtn = $("newQuestionBtn");
const gameQuestion = $("gameQuestion");
const dailyLoveText = $("dailyLoveText");

let currentUser = null;
let currentRoomCode = "";
let unsubscribeMessages = null;

const questions = [
  "What is your favourite memory of us?",
  "What small thing about me makes you smile?",
  "Where should we go on our dream date?",
  "What song reminds you of our relationship?",
  "What is one thing you want us to learn together?",
  "Describe our relationship in three words.",
  "What was your first impression of me?",
  "What is one promise you want us to keep?"
];

const loveCards = [
  "Tell your partner one thing you genuinely appreciate today.",
  "Send your partner a song that reminds you of them.",
  "Plan a small five-minute virtual date tonight.",
  "Share one funny memory that still makes you smile.",
  "Ask your partner how their day really felt."
];

function setLoading(button, loading, loadingText) {
  if (!button) return;
  if (!button.dataset.originalText) button.dataset.originalText = button.textContent;
  button.disabled = loading;
  button.textContent = loading ? loadingText : button.dataset.originalText;
}

function showHomeMessage(message, isError = false) {
  homeMessage.textContent = message;
  homeMessage.classList.toggle("error-message", isError);
}

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => chars[value % chars.length]).join("");
}

function openDashboard(code) {
  currentRoomCode = code;
  roomCodeText.textContent = code;
  homeScreen.classList.remove("active");
  dashboardScreen.classList.add("active");
  showHomeMessage("");
  localStorage.setItem("coupleverseRoom", code);
  listenToMessages(code);
}

function closeDashboard() {
  if (unsubscribeMessages) {
    unsubscribeMessages();
    unsubscribeMessages = null;
  }
  currentRoomCode = "";
  chatMessages.innerHTML = "";
  localStorage.removeItem("coupleverseRoom");
  dashboardScreen.classList.remove("active");
  homeScreen.classList.add("active");
  roomCodeInput.value = "";
}

async function ensureSignedIn() {
  if (auth.currentUser) return auth.currentUser;
  const credential = await signInAnonymously(auth);
  return credential.user;
}

async function createRoom() {
  setLoading(createRoomBtn, true, "Creating...");
  showHomeMessage("Connecting securely...");

  try {
    const user = await ensureSignedIn();
    let code = "";
    let exists = true;

    for (let attempt = 0; attempt < 5 && exists; attempt += 1) {
      code = generateRoomCode();
      const snapshot = await get(ref(database, `rooms/${code}/createdBy`));
      exists = snapshot.exists();
    }

    if (exists) throw new Error("Could not generate a unique room code.");

    // Room metadata is written first; then the creator is added as member.
    await set(ref(database, `rooms/${code}/createdBy`), user.uid);
    await set(ref(database, `rooms/${code}/createdAt`), serverTimestamp());
    await set(ref(database, `rooms/${code}/members/${user.uid}`), true);

    openDashboard(code);
  } catch (error) {
    console.error("Create room failed:", error);
    showHomeMessage("Room create nahi hua. Firebase Rules aur internet check karo.", true);
  } finally {
    setLoading(createRoomBtn, false, "Creating...");
  }
}

async function joinRoom() {
  const code = roomCodeInput.value.trim().toUpperCase();

  if (!/^[A-Z2-9]{6}$/.test(code)) {
    showHomeMessage("Valid 6-character room code enter karo.", true);
    return;
  }

  setLoading(joinRoomBtn, true, "Joining...");
  showHomeMessage("Room join ho raha hai...");

  try {
    const user = await ensureSignedIn();

    // The rule permits adding yourself only when this room exists and has space.
    await set(ref(database, `rooms/${code}/members/${user.uid}`), true);
    openDashboard(code);
  } catch (error) {
    console.error("Join room failed:", error);
    showHomeMessage("Room nahi mila, room full hai, ya code galat hai.", true);
  } finally {
    setLoading(joinRoomBtn, false, "Joining...");
  }
}

function formatMessageTime(timestamp) {
  if (typeof timestamp !== "number") return "";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

function renderMessages(snapshot) {
  chatMessages.innerHTML = "";

  if (!snapshot.exists()) {
    const empty = document.createElement("p");
    empty.className = "empty-chat";
    empty.textContent = "Start your private conversation ❤️";
    chatMessages.appendChild(empty);
    return;
  }

  snapshot.forEach((childSnapshot) => {
    const data = childSnapshot.val();
    if (!data || typeof data.text !== "string") return;

    const bubble = document.createElement("div");
    const mine = data.senderId === currentUser?.uid;
    bubble.className = `chat-bubble ${mine ? "sent" : "received"}`;

    const text = document.createElement("div");
    text.textContent = data.text;
    bubble.appendChild(text);

    const time = document.createElement("small");
    time.textContent = formatMessageTime(data.sentAt);
    bubble.appendChild(time);

    chatMessages.appendChild(bubble);
  });

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function listenToMessages(code) {
  if (unsubscribeMessages) unsubscribeMessages();

  const messagesRef = ref(database, `rooms/${code}/messages`);
  unsubscribeMessages = onValue(
    messagesRef,
    renderMessages,
    (error) => {
      console.error("Message listener failed:", error);
      chatMessages.textContent = "Messages load nahi ho pa rahe.";
    }
  );
}

async function sendMessage() {
  const message = chatInput.value.trim();
  if (!message || !currentRoomCode || !currentUser) return;

  setLoading(sendMessageBtn, true, "Sending...");

  try {
    const newMessageRef = push(ref(database, `rooms/${currentRoomCode}/messages`));
    await set(newMessageRef, {
      text: message,
      senderId: currentUser.uid,
      sentAt: serverTimestamp()
    });
    chatInput.value = "";
    chatInput.focus();
  } catch (error) {
    console.error("Send message failed:", error);
    alert("Message send nahi hua. Room membership ya internet check karo.");
  } finally {
    setLoading(sendMessageBtn, false, "Sending...");
  }
}

showJoinBtn.addEventListener("click", () => joinBox.classList.toggle("hidden"));
createRoomBtn.addEventListener("click", createRoom);
joinRoomBtn.addEventListener("click", joinRoom);
leaveRoomBtn.addEventListener("click", closeDashboard);
sendMessageBtn.addEventListener("click", sendMessage);

roomCodeInput.addEventListener("input", () => {
  roomCodeInput.value = roomCodeInput.value.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 6);
});

roomCodeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") joinRoom();
});

chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

document.querySelectorAll(".feature-card").forEach((card) => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".panel").forEach((panel) => panel.classList.add("hidden"));
    const panel = document.getElementById(card.dataset.panel);
    if (panel) panel.classList.remove("hidden");
  });
});

document.querySelectorAll(".close-panel").forEach((button) => {
  button.addEventListener("click", () => {
    const panel = button.closest(".panel");
    if (panel) panel.classList.add("hidden");
  });
});

function getYouTubeId(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace("www.", "");

    if (hostname === "youtu.be") return parsed.pathname.slice(1).split("/")[0];
    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      if (parsed.pathname === "/watch") return parsed.searchParams.get("v");
      if (parsed.pathname.startsWith("/shorts/")) return parsed.pathname.split("/")[2];
      if (parsed.pathname.startsWith("/embed/")) return parsed.pathname.split("/")[2];
    }
  } catch {
    return null;
  }
  return null;
}

loadVideoBtn.addEventListener("click", () => {
  const videoId = getYouTubeId(videoUrlInput.value.trim());

  if (!videoId || !/^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) {
    videoMessage.textContent = "Please paste a valid YouTube link.";
    videoWrap.classList.add("hidden");
    videoFrame.src = "";
    return;
  }

  videoMessage.textContent = "";
  videoFrame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
  videoWrap.classList.remove("hidden");
});

newQuestionBtn.addEventListener("click", () => {
  const index = Math.floor(Math.random() * questions.length);
  gameQuestion.textContent = questions[index];
});

const todayIndex = new Date().getDate() % loveCards.length;
dailyLoveText.textContent = loveCards[todayIndex];

function applySavedTheme() {
  const isDark = localStorage.getItem("coupleverseTheme") === "dark";
  document.body.classList.toggle("dark", isDark);
  themeBtn.textContent = isDark ? "☀️" : "🌙";
}

themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  themeBtn.textContent = isDark ? "☀️" : "🌙";
  localStorage.setItem("coupleverseTheme", isDark ? "dark" : "light");
});

applySavedTheme();
if (chatNote) chatNote.textContent = "Real-time encrypted connection via Firebase. Share the room code only with your partner.";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Anonymous sign-in failed:", error);
      showHomeMessage("Firebase login failed. Authentication settings check karo.", true);
    }
    return;
  }

  currentUser = user;
  const savedRoom = localStorage.getItem("coupleverseRoom");

  if (savedRoom) {
    try {
      const membership = await get(ref(database, `rooms/${savedRoom}/members/${user.uid}`));
      if (membership.val() === true) openDashboard(savedRoom);
      else localStorage.removeItem("coupleverseRoom");
    } catch (error) {
      console.error("Saved room restore failed:", error);
      localStorage.removeItem("coupleverseRoom");
    }
  }
});
