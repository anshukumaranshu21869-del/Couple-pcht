(() => {
  "use strict";

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

  function generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const values = new Uint32Array(6);
    crypto.getRandomValues(values);
    return Array.from(values, value => chars[value % chars.length]).join("");
  }

  function openDashboard(code) {
    roomCodeText.textContent = code;
    homeScreen.classList.remove("active");
    dashboardScreen.classList.add("active");
    homeMessage.textContent = "";
    localStorage.setItem("coupleverseRoom", code);
  }

  createRoomBtn.addEventListener("click", () => openDashboard(generateRoomCode()));

  showJoinBtn.addEventListener("click", () => {
    joinBox.classList.toggle("hidden");
  });

  joinRoomBtn.addEventListener("click", () => {
    const code = roomCodeInput.value.trim().toUpperCase();

    if (!/^[A-Z0-9]{6,8}$/.test(code)) {
      homeMessage.textContent = "Please enter a valid 6–8 character room code.";
      return;
    }

    openDashboard(code);
  });

  leaveRoomBtn.addEventListener("click", () => {
    localStorage.removeItem("coupleverseRoom");
    dashboardScreen.classList.remove("active");
    homeScreen.classList.add("active");
    roomCodeInput.value = "";
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

  function addChatMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    bubble.textContent = message;
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    chatInput.value = "";
  }

  sendMessageBtn.addEventListener("click", addChatMessage);
  chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") addChatMessage();
  });

  function getYouTubeId(url) {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.replace("www.", "");

      if (hostname === "youtu.be") {
        return parsed.pathname.slice(1).split("/")[0];
      }

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

  themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    themeBtn.textContent = isDark ? "☀️" : "🌙";
    localStorage.setItem("coupleverseTheme", isDark ? "dark" : "light");
  });

  if (localStorage.getItem("coupleverseTheme") === "dark") {
    document.body.classList.add("dark");
    themeBtn.textContent = "☀️";
  }

  const savedRoom = localStorage.getItem("coupleverseRoom");
  if (savedRoom) openDashboard(savedRoom);
})();
