import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

import {
  getDatabase,
  get,
  onValue,
  push,
  ref,
  serverTimestamp,
  set
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAJ6oo2sDlhAOY_Z-igLKopxocbt8w7-GQ",
  authDomain: "coupleverse-5af32.firebaseapp.com",
  databaseURL: "https://coupleverse-5af32-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "coupleverse-5af32",
  storageBucket: "coupleverse-5af32.firebasestorage.app",
  messagingSenderId: "720450290648",
  appId: "1:720450290648:web:5ab2c57ac2ef44a6baa8ad"
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
let stopMessageListener = null;

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

function showMessage(text, isError = false) {
  homeMessage.textContent = text;
  homeMessage.style.color = isError ? "#c62828" : "";
}

function setButtonLoading(button, loading, text) {
  if (!button.dataset.normalText) {
    button.dataset.normalText = button.textContent;
  }

  button.disabled = loading;
  button.textContent = loading ? text : button.dataset.normalText;
}

function generateRoomCode() {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const randomValues = new Uint32Array(6);

  crypto.getRandomValues(randomValues);

  return Array.from(
    randomValues,
    value => characters[value % characters.length]
  ).join("");
}

async function getSignedInUser() {
  if (auth.currentUser) {
    return auth.currentUser;
  }

  const result = await signInAnonymously(auth);
  return result.user;
}

function openDashboard(roomCode) {
  currentRoomCode = roomCode;
  roomCodeText.textContent = roomCode;

  homeScreen.classList.remove("active");
  dashboardScreen.classList.add("active");

  localStorage.setItem("coupleverseRoom", roomCode);

  showMessage("");
  listenForMessages(roomCode);
}

function leaveRoom() {
  if (stopMessageListener) {
    stopMessageListener();
    stopMessageListener = null;
  }

  currentRoomCode = "";
  chatMessages.innerHTML = "";

  localStorage.removeItem("coupleverseRoom");

  dashboardScreen.classList.remove("active");
  homeScreen.classList.add("active");

  roomCodeInput.value = "";
}

async function createRoom() {
  setButtonLoading(createRoomBtn, true, "Creating...");
  showMessage("Secure room ban raha hai...");

  try {
    const user = await getSignedInUser();

    let roomCode = "";
    let roomAlreadyExists = true;

    for (let attempt = 0; attempt < 5; attempt++) {
      roomCode = generateRoomCode();

      const roomSnapshot = await get(
        ref(database, `rooms/${roomCode}`)
      );

      if (!roomSnapshot.exists()) {
        roomAlreadyExists = false;
        break;
      }
    }

    if (roomAlreadyExists) {
      throw new Error("Unique room code generate nahi hua.");
    }

    await set(ref(database, `rooms/${roomCode}`), {
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      members: {
        [user.uid]: true
      }
    });

    openDashboard(roomCode);
  } catch (error) {
    console.error("Create room error:", error);

    showMessage(
      `Room create nahi hua: ${error.code || error.message}`,
      true
    );
  } finally {
    setButtonLoading(createRoomBtn, false, "Creating...");
  }
}

async function joinRoom() {
  const roomCode = roomCodeInput.value.trim().toUpperCase();

  if (!/^[A-Z2-9]{6}$/.test(roomCode)) {
    showMessage("Sahi 6-character room code enter karo.", true);
    return;
  }

  setButtonLoading(joinRoomBtn, true, "Joining...");
  showMessage("Room check ho raha hai...");

  try {
    const user = await getSignedInUser();

    const roomSnapshot = await get(
      ref(database, `rooms/${roomCode}/createdBy`)
    );

    if (!roomSnapshot.exists()) {
      throw new Error("Room code nahi mila.");
    }

    await set(
      ref(database, `rooms/${roomCode}/members/${user.uid}`),
      true
    );

    openDashboard(roomCode);
  } catch (error) {
    console.error("Join room error:", error);

    showMessage(
      `Room join nahi hua: ${error.code || error.message}`,
      true
    );
  } finally {
    setButtonLoading(joinRoomBtn, false, "Joining...");
  }
}

function renderMessages(snapshot) {
  chatMessages.innerHTML = "";

  if (!snapshot.exists()) {
    const emptyMessage = document.createElement("p");
    emptyMessage.textContent = "Start your private conversation ❤️";
    emptyMessage.style.textAlign = "center";
    chatMessages.appendChild(emptyMessage);
    return;
  }

  snapshot.forEach(messageSnapshot => {
    const messageData = messageSnapshot.val();

    if (!messageData || typeof messageData.text !== "string") {
      return;
    }

    const messageBubble = document.createElement("div");

    const isMyMessage =
      messageData.senderId === currentUser?.uid;

    messageBubble.className = isMyMessage
      ? "chat-bubble sent"
      : "chat-bubble received";

    messageBubble.textContent = messageData.text;

    chatMessages.appendChild(messageBubble);
  });

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function listenForMessages(roomCode) {
  if (stopMessageListener) {
    stopMessageListener();
  }

  const messagesReference = ref(
    database,
    `rooms/${roomCode}/messages`
  );

  stopMessageListener = onValue(
    messagesReference,
    renderMessages,
    error => {
      console.error("Messages load error:", error);
      chatMessages.textContent =
        `Messages load nahi hue: ${error.code || error.message}`;
    }
  );
}

async function sendMessage() {
  const messageText = chatInput.value.trim();

  if (!messageText || !currentRoomCode || !currentUser) {
    return;
  }

  setButtonLoading(sendMessageBtn, true, "Sending...");

  try {
    const newMessageReference = push(
      ref(database, `rooms/${currentRoomCode}/messages`)
    );

    await set(newMessageReference, {
      text: messageText,
      senderId: currentUser.uid,
      sentAt: serverTimestamp()
    });

    chatInput.value = "";
    chatInput.focus();
  } catch (error) {
    console.error("Message send error:", error);

    alert(
      `Message send nahi hua: ${error.code || error.message}`
    );
  } finally {
    setButtonLoading(sendMessageBtn, false, "Sending...");
  }
}

showJoinBtn.addEventListener("click", () => {
  joinBox.classList.toggle("hidden");
});

createRoomBtn.addEventListener("click", createRoom);
joinRoomBtn.addEventListener("click", joinRoom);
leaveRoomBtn.addEventListener("click", leaveRoom);
sendMessageBtn.addEventListener("click", sendMessage);

roomCodeInput.addEventListener("input", () => {
  roomCodeInput.value = roomCodeInput.value
    .toUpperCase()
    .replace(/[^A-Z2-9]/g, "")
    .slice(0, 6);
});

roomCodeInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    joinRoom();
  }
});

chatInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    sendMessage();
  }
});

document.querySelectorAll(".feature-card").forEach(card => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".panel").forEach(panel => {
      panel.classList.add("hidden");
    });

    const selectedPanel = document.getElementById(
      card.dataset.panel
    );

    if (selectedPanel) {
      selectedPanel.classList.remove("hidden");
    }
  });
});

document.querySelectorAll(".close-panel").forEach(button => {
  button.addEventListener("click", () => {
    const panel = button.closest(".panel");

    if (panel) {
      panel.classList.add("hidden");
    }
  });
});

function getYouTubeId(url) {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.replace("www.", "");

    if (hostname === "youtu.be") {
      return parsedUrl.pathname.slice(1).split("/")[0];
    }

    if (
      hostname === "youtube.com" ||
      hostname === "m.youtube.com"
    ) {
      if (parsedUrl.pathname === "/watch") {
        return parsedUrl.searchParams.get("v");
      }

      if (parsedUrl.pathname.startsWith("/shorts/")) {
        return parsedUrl.pathname.split("/")[2];
      }

      if (parsedUrl.pathname.startsWith("/embed/")) {
        return parsedUrl.pathname.split("/")[2];
      }
    }
  } catch {
    return null;
  }

  return null;
}

loadVideoBtn.addEventListener("click", () => {
  const videoId = getYouTubeId(
    videoUrlInput.value.trim()
  );

  if (
    !videoId ||
    !/^[a-zA-Z0-9_-]{6,20}$/.test(videoId)
  ) {
    videoMessage.textContent =
      "Please paste a valid YouTube link.";

    videoWrap.classList.add("hidden");
    videoFrame.src = "";
    return;
  }

  videoMessage.textContent = "";

  videoFrame.src =
    `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;

  videoWrap.classList.remove("hidden");
});

newQuestionBtn.addEventListener("click", () => {
  const randomIndex = Math.floor(
    Math.random() * questions.length
  );

  gameQuestion.textContent = questions[randomIndex];
});

const todayIndex =
  new Date().getDate() % loveCards.length;

dailyLoveText.textContent = loveCards[todayIndex];

themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const darkMode =
    document.body.classList.contains("dark");

  themeBtn.textContent = darkMode ? "☀️" : "🌙";

  localStorage.setItem(
    "coupleverseTheme",
    darkMode ? "dark" : "light"
  );
});

if (
  localStorage.getItem("coupleverseTheme") === "dark"
) {
  document.body.classList.add("dark");
  themeBtn.textContent = "☀️";
}

onAuthStateChanged(auth, async user => {
  if (!user) {
    try {
      showMessage("Firebase se connect ho raha hai...");

      await signInAnonymously(auth);
    } catch (error) {
      console.error("Firebase login error:", error);

      showMessage(
        `Firebase login failed: ${error.code || error.message}`,
        true
      );
    }

    return;
  }

  currentUser = user;
  showMessage("");

  const savedRoom =
    localStorage.getItem("coupleverseRoom");

  if (!savedRoom) {
    return;
  }

  try {
    const membershipSnapshot = await get(
      ref(
        database,
        `rooms/${savedRoom}/members/${user.uid}`
      )
    );

    if (membershipSnapshot.val() === true) {
      openDashboard(savedRoom);
    } else {
      localStorage.removeItem("coupleverseRoom");
    }
  } catch (error) {
    console.error("Saved room error:", error);
    localStorage.removeItem("coupleverseRoom");
  }
});
