class FirebaseService {
  constructor() {
    this.db = null;
    this.initialized = false;
    this.unsubscribe = null;
    this.onTransactionUpdate = null;
  }
  async init() {
    if (this.initialized) return;
    try {
      if (typeof firebase === "undefined") {
        console.error("❌ Firebase SDK not loaded");
        return false;
      }
      const firebaseConfig = {
        apiKey: "AIzaSyBm99LuoWkf0BYVxy7fumptxXF_RiwL44w",
        authDomain: "flowpay-c5dc6.firebaseapp.com",
        projectId: "flowpay-c5dc6",
        storageBucket: "flowpay-c5dc6.firebasestorage.app",
        messagingSenderId: "901105128726",
        appId: "1:901105128726:web:c230a8f575cfeaf8adec37",
        measurementId: "G-DGF2FTH7YJ",
      };
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      this.db = firebase.firestore();
      this.initialized = true;
      return true;
    } catch (error) {
      console.error("❌ Firebase initialization error:", error);
      return false;
    }
  }

  // AI Command History Methods
  async saveAICommand(userId, command, result) {
    if (!this.initialized) {
      await this.init();
    }
    try {
      const commandData = {
        userId: userId || "anonymous",
        command: {
          prompt: command.prompt,
          action: command.action,
          jsonCommand: command.jsonCommand,
        },
        result: result,
        success: result.success !== false,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: new Date().toISOString(),
      };

      await this.db.collection("ai_commands").add(commandData);

      console.log("✅ AI command saved to Firebase");
      return true;
    } catch (error) {
      console.error("⚠️ Error saving AI command to Firebase:", error.message);
      console.log("💡 Command will still work, just not saved to history");
      // Don't throw error - allow command execution to continue
      return false;
    }
  }

  async getAICommandHistory(userId, limit = 50) {
    console.log("🔍 [Firebase] getAICommandHistory called");
    console.log("👤 [Firebase] User ID:", userId);
    console.log("📊 [Firebase] Limit:", limit);

    if (!this.initialized) {
      console.log("⚙️ [Firebase] Not initialized, initializing now...");
      await this.init();
    }

    try {
      console.log(
        "📡 [Firebase] Creating query (without index requirement)..."
      );
      // Query by userId only, then sort in JavaScript to avoid index requirement
      const snapshot = await this.db
        .collection("ai_commands")
        .where("userId", "==", userId || "anonymous")
        .get();

      console.log(
        "📦 [Firebase] Query executed. Documents found:",
        snapshot.size
      );

      const commands = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log("📄 [Firebase] Document:", doc.id, data);
        commands.push({
          id: doc.id,
          ...data,
          timestamp:
            data.createdAt ||
            data.timestamp?.toDate?.()?.toISOString() ||
            new Date().toISOString(),
        });
      });

      // Sort by timestamp in JavaScript (newest first)
      commands.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeB - timeA; // Descending order
      });

      // Apply limit after sorting
      const limitedCommands = commands.slice(0, limit);

      console.log(
        `✅ [Firebase] Loaded ${limitedCommands.length} commands from history`
      );
      console.log("📋 [Firebase] Commands:", limitedCommands);
      return limitedCommands;
    } catch (error) {
      console.error("❌ [Firebase] Error fetching AI command history:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.log("💡 History feature requires proper Firebase permissions");
      return [];
    }
  }

  async rerunAICommand(commandId) {
    if (!this.initialized) {
      await this.init();
    }
    try {
      const doc = await this.db.collection("ai_commands").doc(commandId).get();

      if (!doc.exists) {
        throw new Error("Command not found");
      }

      return doc.data().jsonCommand;
    } catch (error) {
      console.error("❌ Error re-running command:", error);
      throw error;
    }
  }

  async saveTransaction(walletAddress, transaction) {
    if (!this.initialized) {
      return false;
    }
    try {
      const docId = transaction.hash;
      await this.db
        .collection("wallets")
        .doc(walletAddress.toLowerCase())
        .collection("transactions")
        .doc(docId)
        .set(
          {
            ...transaction,
            syncedAt: firebase.firestore.FieldValue.serverTimestamp(),
            walletAddress: walletAddress.toLowerCase(),
          },
          { merge: true }
        );
      return true;
    } catch (error) {
      console.error("❌ Error saving to Firebase:", error);
      return false;
    }
  }
  async getTransactions(walletAddress) {
    if (!this.initialized) {
      return [];
    }
    try {
      const snapshot = await this.db
        .collection("wallets")
        .doc(walletAddress.toLowerCase())
        .collection("transactions")
        .orderBy("date", "desc")
        .get();
      const transactions = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        transactions.push({
          hash: doc.id,
          type: data.type,
          address: data.address,
          amount: data.amount,
          currency: data.currency,
          status: data.status,
          date: data.date,
          blockNumber: data.blockNumber,
          gasUsed: data.gasUsed,
          fee: data.fee,
        });
      });
      return transactions;
    } catch (error) {
      console.error("❌ Error fetching from Firebase:", error);
      return [];
    }
  }
  async syncLocalToFirebase(walletAddress) {
    const localTxs = localStorage.getItem("transactions");
    if (!localTxs) {
      return;
    }
    try {
      const transactions = JSON.parse(localTxs);
      let syncedCount = 0;
      for (const tx of transactions) {
        const success = await this.saveTransaction(walletAddress, tx);
        if (success) syncedCount++;
      }
    } catch (error) {
      console.error("❌ Error syncing to Firebase:", error);
    }
  }
  async loadAndMergeTransactions(walletAddress) {
    try {
      const firebaseTxs = await this.getTransactions(walletAddress);
      const localTxs = JSON.parse(localStorage.getItem("transactions") || "[]");
      const allTxs = [...firebaseTxs];
      const existingHashes = new Set(firebaseTxs.map((tx) => tx.hash));
      localTxs.forEach((tx) => {
        if (!existingHashes.has(tx.hash)) {
          allTxs.push(tx);
        }
      });
      allTxs.sort((a, b) => new Date(b.date) - new Date(a.date));
      localStorage.setItem("transactions", JSON.stringify(allTxs));
      return allTxs;
    } catch (error) {
      console.error("❌ Error merging transactions:", error);
      return JSON.parse(localStorage.getItem("transactions") || "[]");
    }
  }
  subscribeToTransactions(walletAddress, callback) {
    if (!this.initialized) {
      return null;
    }
    try {
      if (this.unsubscribe) {
        this.unsubscribe();
      }
      this.unsubscribe = this.db
        .collection("wallets")
        .doc(walletAddress.toLowerCase())
        .collection("transactions")
        .orderBy("date", "desc")
        .onSnapshot(
          (snapshot) => {
            const transactions = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              transactions.push({
                hash: doc.id,
                type: data.type,
                address: data.address,
                amount: data.amount,
                currency: data.currency,
                status: data.status,
                date: data.date,
                blockNumber: data.blockNumber,
                gasUsed: data.gasUsed,
                fee: data.fee,
              });
            });
            localStorage.setItem("transactions", JSON.stringify(transactions));
            if (callback && typeof callback === "function") {
              callback(transactions);
            }
          },
          (error) => {
            console.error("❌ Real-time listener error:", error);
          }
        );
      return this.unsubscribe;
    } catch (error) {
      console.error("❌ Error setting up real-time listener:", error);
      return null;
    }
  }
  unsubscribeFromTransactions() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
  async autoBackupLocalStorage(walletAddress) {
    const backupKey = `firebase_backup_done_${walletAddress.toLowerCase()}`;
    const alreadyBackedUp = localStorage.getItem(backupKey);
    if (alreadyBackedUp === "true") {
      return;
    }
    const localTxs = localStorage.getItem("transactions");
    if (!localTxs) {
      localStorage.setItem(backupKey, "true");
      return;
    }
    try {
      const transactions = JSON.parse(localTxs);
      if (transactions.length === 0) {
        localStorage.setItem(backupKey, "true");
        return;
      }
      let backedUpCount = 0;
      for (const tx of transactions) {
        const success = await this.saveTransaction(walletAddress, tx);
        if (success) backedUpCount++;
      }
      localStorage.setItem(backupKey, "true");
    } catch (error) {
      console.error("❌ Error during auto-backup:", error);
    }
  }
}

const firebaseService = new FirebaseService();

window.firebaseService = firebaseService;
