# Team Vote Map - Bug Tracker

**Last Updated:** 2025-10-28
**Total Bugs:** 11 (P0: 0, P1: 2, P2: 3, P3: 6)

**📁 Detailed Reports:** [.vscode/bugs/](.vscode/bugs/) - Each bug is copy-paste ready for Claude Code sessions

---

## ✅ RESOLVED (P0)

### ~~P0-1: TypeScript Compilation Error - JWT Token Parsing~~
**Status:** ✅ FIXED
**Fixed in:** `src/stores/admin-auth.ts`

### ~~P0-2: SSR/Build Errors with Zustand Persist~~
**Status:** ✅ FIXED
**Fixed in:** `src/stores/admin-auth.ts`, `src/contexts/MapContext.tsx`

---

## 🔴 P1 - HIGH PRIORITY (Breaks UX/Functionality)

### [P1-1: Dark Text on Dark Background](.vscode/bugs/P1-1-dark-text-on-dark-background.md) 🔗
**Impact:** Users cannot read vote form text
**Time:** 30 min | **Difficulty:** ⭐ Easy
**Status:** 🔴 OPEN

**Quick Fix:** Change `text-gray-900` → `text-white` and `bg-white` → `bg-gray-900` in 7 files.

### [P1-2: Map Loading Issues & Error Handling](.vscode/bugs/P1-2-map-loading-error-handling.md) 🔗
**Impact:** Map may fail to load without clear feedback
**Time:** 1 hour | **Difficulty:** ⭐⭐ Medium
**Status:** 🔴 OPEN

**Quick Fix:** Update tile server to reliable OSM, add retry mechanism, improve error display.

---

## 🟡 P2 - MEDIUM PRIORITY (Features Incomplete)

### [P2-1: Analytics Dashboard Shows Mock Data](.vscode/bugs/P2-1-analytics-mock-data.md) 🔗
**Impact:** Admins see fake statistics
**Time:** 3-4 hours | **Difficulty:** ⭐⭐⭐ Medium-High
**Status:** 🟡 OPEN

**Required:** Create analytics API endpoint + service, update frontend to fetch real data.

### [P2-2: Settings Page UI Only](.vscode/bugs/P2-2-settings-backend.md) 🔗
**Impact:** Settings cannot be saved
**Time:** 4-6 hours | **Difficulty:** ⭐⭐⭐ Medium-High
**Status:** 🟡 OPEN

**Required:** Database schema, API endpoints, form integration. Can defer (env vars work).

### [P2-3: Missing Recent Votes API](.vscode/bugs/P2-3-recent-votes-api.md) 🔗
**Impact:** Match detail page shows sample data
**Time:** 1-2 hours | **Difficulty:** ⭐⭐ Medium
**Status:** 🟡 OPEN

**Required:** Create `/api/admin/matches/[id]/votes` endpoint, update chart.

---

## 🔵 P3 - LOW PRIORITY (Code Quality & Nice-to-Have)

**📄 See:** [.vscode/bugs/P3-ALL-low-priority-bugs.md](.vscode/bugs/P3-ALL-low-priority-bugs.md) 🔗

All 6 P3 bugs are documented in a single comprehensive file:

- **P3-1:** console.log Instead of Winston (1 hour, ⭐ Easy)
- **P3-2:** Missing Error Boundaries (2 hours, ⭐⭐ Medium)
- **P3-3:** Map Tile Server Reliability (30 min, ⭐ Easy)
- **P3-4:** Missing Unit Tests (8+ hours, ⭐⭐⭐⭐ High) - Defer
- **P3-5:** No Offline Support (3-4 hours, ⭐⭐⭐ Medium) - Backlog
- **P3-6:** Build Pre-rendering Warnings (✅ Expected, not a bug)

---

## 📊 Statistics

- **Total Open Bugs:** 11
- **Critical (P1):** 2
- **Medium (P2):** 3
- **Low (P3):** 6
- **Fixed:** 2

---

## Quick Action Items

**Immediate (This Week):**
1. Fix P1-1 (Dark text) - 30 min
2. Fix P1-2 (Map errors) - 1 hour

**Short-term (This Sprint):**
3. Implement P2-1 (Analytics API) - 3-4 hours
4. Implement P2-3 (Recent votes API) - 1-2 hours

**Long-term (Next Sprint):**
5. Implement P2-2 (Settings backend) - 4-6 hours
6. Fix P3-1 (Logger) - 1 hour
7. Add P3-2 (Error boundaries) - 2 hours
