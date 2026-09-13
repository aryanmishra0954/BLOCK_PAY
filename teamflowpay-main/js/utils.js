"use strict";

const NotificationService = {
  TYPES: {
    SUCCESS: "success",
    ERROR: "error",
    INFO: "info",
    WARNING: "warning",
  },

  COLORS: {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
    warning: "bg-yellow-500",
  },

  DURATION: 3000,

  show(message, type = "info") {
    this.removeExisting();

    const notification = this.createElement(message, type);
    document.body.appendChild(notification);

    setTimeout(() => {
      this.remove(notification);
    }, this.DURATION);
  },

  createElement(message, type) {
    const notification = document.createElement("div");
    notification.className = `notification fixed top-4 right-4 ${this.COLORS[type]} text-white px-6 py-3 rounded-xl shadow-lg z-50 transition-all transform translate-x-0`;

    notification.innerHTML = `
            <div class="flex items-center gap-2">
                <span>${message}</span>
            </div>
        `;

    return notification;
  },

  remove(notification) {
    notification.style.transform = "translateX(120%)";
    setTimeout(() => notification.remove(), 300);
  },

  removeExisting() {
    const existing = document.querySelector(".notification");
    if (existing) {
      existing.remove();
    }
  },
};

function showNotification(message, type = "info") {
  NotificationService.show(message, type);
}

window.NotificationService = NotificationService;
window.showNotification = showNotification;
