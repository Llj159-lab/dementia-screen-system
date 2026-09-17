const QUEUE_KEY = 'cognitive_offline_queue';
const SYNC_STATS_KEY = 'cognitive_sync_stats';

function loadQueue() {
  try {
    return wx.getStorageSync(QUEUE_KEY) || [];
  } catch (e) {
    return [];
  }
}

function saveQueue(queue) {
  wx.setStorageSync(QUEUE_KEY, queue);
}

function loadStats() {
  try {
    return wx.getStorageSync(SYNC_STATS_KEY) || { lastSyncAt: null, completedCount: 0 };
  } catch (e) {
    return { lastSyncAt: null, completedCount: 0 };
  }
}

function saveStats(stats) {
  wx.setStorageSync(SYNC_STATS_KEY, stats);
}

function enqueue(item) {
  const queue = loadQueue();
  queue.push({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, createdAt: new Date().toISOString(), ...item });
  saveQueue(queue);
}

function clearQueue() {
  wx.removeStorageSync(QUEUE_KEY);
}

module.exports = { loadQueue, saveQueue, loadStats, saveStats, enqueue, clearQueue };
