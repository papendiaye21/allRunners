      const runs = []
      let pendingDeleteIndex = null
      let runDetailIndex = null
      let userProfile = null
      let previousTabName = 'home'
      let runMapInstance = null
      let mapUserMarker = null
      let mapAccuracyCircle = null
      let mapWatchId = null
      let mapTrailWatchId = null
      let mapTrailPolyline = null
      let mapTrailPoints = []
      let mapTrailTracking = false
      const TRAILS_STORAGE_KEY = 'allrunners_trails_v1'
      const TRAILS_SYNC_PREF_KEY = 'allrunners_trails_auto_sync_v1'
      const SYNC_STORAGE_KEY = 'allrunners_smashrun_sync_v1'
      const ONBOARD_KEY = 'allrunners_onboarding_v1'
      const MILESTONE_KEY = 'allrunners_milestone_km_floor_v1'
      const FEATURE_STORAGE_KEY = 'allrunners_feature_pack_v1'
      const APPLE_DEV_TOKEN_KEY = 'allrunners_apple_dev_token_v1'
      const SMASHRUN_AUTO_CONNECT_KEY = 'allrunners_smashrun_auto_connect_once_v1'
      const RUN_TECHNIQUE_TRICKS = [
        'Cadence trick: think “light feet, quick turnover” for 30 seconds—shortens stride without sprinting.',
        'Downhill trick: lean from the ankles, let arms balance you; avoid braking with heavy heel stomps.',
        'Uphill trick: shorten stride, drive elbows back, keep eyes up—save the long stride for the flat.',
        'Cornering trick: ease slightly before the bend, smooth stride through the apex, roll out relaxed.',
        'Arm swing trick: elbows ~90°, hands brush hip to hip—no cross-body chicken wings.',
        'Breathing trick: match an easy rhythm (e.g. in for 3, out for 3) on steady runs.',
        'Start-line trick: first km controlled—negative splits beat flying-and-fading every time.',
        'Tread trick: run tangents on curves to shave distance without extra speed.',
        'Form reset: every 10 minutes, tall posture, shoulders down, glance at relaxed jaw and hands.',
        'Strides trick: after an easy run, 4–6 × 80–100 m smooth build-ups, walk back—neuromuscular sharpness.',
        'Track trick: on intervals, hit splits by effort first—watch second—so you learn sustainable rhythm.',
        'Trail trick: scan 3–5 m ahead for roots; shorten stride on technical bits instead of staring at feet.',
        'Heat trick: slow target pace slightly and prioritize shade sides of paths—same effort, safer load.',
        'Wind trick: tuck behind a partner or hedge on headwinds; relax shoulders when it pushes you.',
        'Long-run trick: split the distance into segments—each segment, reset tall posture and relaxed shoulders.',
        'Recovery jog trick: the day after hard work, truly easy—if you can sing a line, pace is right.',
      ]

      const SHOE_FOR_FOOT = {
        neutral: [
          'Neutral shoes: balanced cushion and flex; rotate two pairs so foam recovers between runs.',
          'Check wear on outsole heel vs forefoot—if even, stay neutral; replace before rubber is bald.',
          'Half-size up only if toes clear a thumb at standing—too big lets the foot slide forward downhill.',
        ],
        flat: [
          'More roll-in: try stable/guidance shoes with structured support—get fitted, do not guess online.',
          'Look for secure midfoot wrap so the arch does not swim inside the shoe on turns.',
          'Replace stability shoes when posted foam feels mushy—support fades before the sole looks gone.',
        ],
        high: [
          'High arch: softer landing often needs cushion with flex; avoid rigid plates if they feel harsh.',
          'Heel cup should hug without pinching—wide lacing through midfoot can reduce top-of-foot pressure.',
          'Watch lateral wear; if outside edge scuffs fast, prioritize durable rubber under the strike zone.',
        ],
        wide: [
          'Wide forefoot: seek wide sizes or toe-box brands; numb toes mean the box is too narrow.',
          'Thin socks on wide feet reduce bulk; thicker socks only if heel still slips.',
          'Lace ladder through midfoot, skip the tight criss-cross over the widest metatarsal zone.',
        ],
        narrow: [
          'Narrow heel slip: heel-lock lacing (extra eyelet loop) before tying—snugs the rear without crushing toes.',
          'Insoles or half-size down can help only if toes still have wiggle room—never crush the forefoot.',
          'Thin tongue pads or runner’s knot can stop lift without tightening the whole shoe aggressively.',
        ],
      }

      function dayIndexMondayFirst() {
        const wd = new Date().getDay()
        return wd === 0 ? 6 : wd - 1
      }

      function shoeLineForProfile(profile, dayOffset) {
        const key =
          profile === 'flat' ||
          profile === 'high' ||
          profile === 'wide' ||
          profile === 'narrow'
            ? profile
            : 'neutral'
        const lines = SHOE_FOR_FOOT[key] || SHOE_FOR_FOOT.neutral
        return lines[dayOffset % lines.length]
      }
      const MUSIC_LIBRARY = [
        { id: 'tempo-breeze', title: 'Tempo Breeze', mood: 'tempo', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
        { id: 'steady-flow', title: 'Steady Flow', mood: 'steady', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
        { id: 'sprint-burst', title: 'Sprint Burst', mood: 'sprint', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
        { id: 'chill-jog', title: 'Chill Jog', mood: 'chill', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
      ]
      let mapTrailStartMs = null
      let mapTrailMode = 'run'
      let monitorTicker = null
      let reminderTimer = null
      let musicAudioEl = null
      let musicCurrentId = ''
      let musicSource = 'local'
      let appleMusicKit = null
      let appleMusicReady = false
      let appleMusicAuthorized = false
      let appleMusicScriptPromise = null
      let featureState = {
        hrReadings: [],
        tipIndex: 0,
        joinedCommunity: false,
        communityMembers: 0,
        communityPosts: [],
        friendHandle: '',
        challengeDay: '',
        musicRecent: [],
        musicCurrent: '',
        musicSource: 'local',
        hrWatchAutoLog: false,
        hrWatchDeviceId: '',
        footProfile: 'neutral',
        coachMoodEnergy: 3,
        coachMoodStress: 3,
        coachMoodSoreness: 3,
        coachMoodSleep: 3,
      }

      let hrBtDevice = null
      let hrBtCharacteristic = null
      let hrWatchLastLogMs = 0
      const HR_BT_SERVICE = 'heart_rate'
      const HR_BT_MEASUREMENT = 'heart_rate_measurement'

      const HR_READINGS_MAX = 100

      let runsLoading = false
      let lastRunsSyncAt = null
      const LAST_SYNC_STORAGE_KEY = 'allrunners_last_sync_ms_v1'
      const RUNS_BG_SYNC_INTERVAL_MS = 120000
      const RUNS_BG_SYNC_MIN_GAP_MS = 45000
      let runsBgSyncTimerId = null
      let smashrunConnected = false
      let runsSort = 'date-desc'
      let runsFilter = 'all'
      let monthlyGoalKm = null
      let monthlyDoneKm = null
      let monthlyGoalText = ''
      let coachTrendRows = []
      let speechRecognizer = null
      let detailModalFocusBefore = null
      let deleteModalFocusBefore = null
      let milestoneKmFloor = 0

      try {
        const m = parseInt(sessionStorage.getItem(MILESTONE_KEY) || '0', 10)
        milestoneKmFloor = Number.isFinite(m) ? m : 0
      } catch (_) {
        milestoneKmFloor = 0
      }
      readFeatureState()

      function readSyncState() {
        try {
          const raw = localStorage.getItem(SYNC_STORAGE_KEY)
          if (!raw) return { lastWatermark: 0 }
          const parsed = JSON.parse(raw)
          const lw = Number(parsed && parsed.lastWatermark)
          return { lastWatermark: Number.isFinite(lw) && lw > 0 ? lw : 0 }
        } catch (_) {
          return { lastWatermark: 0 }
        }
      }

      function writeSyncState(state) {
        try {
          localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(state))
          return true
        } catch (_) {
          return false
        }
      }

      function readFeatureState() {
        try {
          const raw = localStorage.getItem(FEATURE_STORAGE_KEY)
          if (!raw) return
          const parsed = JSON.parse(raw)
          if (!parsed || typeof parsed !== 'object') return
          featureState = Object.assign(featureState, parsed)
          if (!Array.isArray(featureState.hrReadings)) featureState.hrReadings = []
          if (!Array.isArray(featureState.communityPosts)) featureState.communityPosts = []
          if (!Array.isArray(featureState.musicRecent)) featureState.musicRecent = []
          featureState.tipIndex =
            Math.max(0, Number(featureState.tipIndex) || 0) % RUN_TECHNIQUE_TRICKS.length
          const fp = String(featureState.footProfile || 'neutral')
          featureState.footProfile = ['neutral', 'flat', 'high', 'wide', 'narrow'].includes(fp)
            ? fp
            : 'neutral'
          featureState.communityMembers = 0
          featureState.friendHandle = String(featureState.friendHandle || '').slice(0, 24)
          featureState.musicCurrent = String(featureState.musicCurrent || '')
          featureState.musicSource = featureState.musicSource === 'apple' ? 'apple' : 'local'
          featureState.hrWatchAutoLog = Boolean(featureState.hrWatchAutoLog)
          featureState.hrWatchDeviceId = String(featureState.hrWatchDeviceId || '').slice(0, 200)
          featureState.coachMoodEnergy = Math.max(1, Math.min(5, Number(featureState.coachMoodEnergy) || 3))
          featureState.coachMoodStress = Math.max(1, Math.min(5, Number(featureState.coachMoodStress) || 3))
          featureState.coachMoodSoreness = Math.max(1, Math.min(5, Number(featureState.coachMoodSoreness) || 3))
          featureState.coachMoodSleep = Math.max(1, Math.min(5, Number(featureState.coachMoodSleep) || 3))
        } catch (_) {}
      }

      function writeFeatureState() {
        try {
          localStorage.setItem(FEATURE_STORAGE_KEY, JSON.stringify(featureState))
        } catch (_) {}
      }

      function localDateStamp(tsMs) {
        const d = tsMs ? new Date(tsMs) : new Date()
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return y + '-' + m + '-' + day
      }

      function addDaysStamp(stamp, delta) {
        const base = new Date(stamp + 'T12:00:00')
        base.setDate(base.getDate() + delta)
        return localDateStamp(base.getTime())
      }

      function dedupeSortedRunDays() {
        const set = new Set()
        runs.forEach((run) => {
          const d = run && run.date ? String(run.date).slice(0, 10) : ''
          if (/^\d{4}-\d{2}-\d{2}$/.test(d)) set.add(d)
        })
        return Array.from(set).sort((a, b) => b.localeCompare(a))
      }

      function computeRunStreak() {
        const days = dedupeSortedRunDays()
        if (!days.length) return 0
        let streak = 1
        for (let i = 1; i < days.length; i++) {
          const prev = days[i - 1]
          const cur = days[i]
          if (addDaysStamp(cur, 1) === prev) {
            streak += 1
          } else {
            break
          }
        }
        return streak
      }

      function inferHrZone(bpm) {
        const b = Number(bpm)
        if (!Number.isFinite(b) || b <= 0) return '—'
        if (b < 110) return 'Zone 1 · Recovery'
        if (b < 130) return 'Zone 2 · Easy aerobic'
        if (b < 150) return 'Zone 3 · Steady endurance'
        if (b < 170) return 'Zone 4 · Tempo / threshold'
        return 'Zone 5 · Hard effort'
      }

      function formatElapsedClock(ms) {
        const total = Math.max(0, Math.floor(ms / 1000))
        const hh = Math.floor(total / 3600)
        const mm = Math.floor((total % 3600) / 60)
        const ss = total % 60
        if (hh > 0) return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0')
        return String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0')
      }

      function haversineMeters(a, b) {
        const toRad = Math.PI / 180
        const lat1 = a.lat * toRad
        const lat2 = b.lat * toRad
        const dLat = (b.lat - a.lat) * toRad
        const dLon = (b.lon - a.lon) * toRad
        const s =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
        return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(s)))
      }

      function trailDistanceMeters() {
        if (!Array.isArray(mapTrailPoints) || mapTrailPoints.length < 2) return 0
        let total = 0
        for (let i = 1; i < mapTrailPoints.length; i++) {
          total += haversineMeters(mapTrailPoints[i - 1], mapTrailPoints[i])
        }
        return total
      }

      function renderPersonalizedRunningPlan() {
        const weekEl = document.getElementById('personalizedPlanWeek')
        const todayEl = document.getElementById('runningTipText')
        const sel = document.getElementById('footProfileSelect')
        if (sel && featureState.footProfile) sel.value = featureState.footProfile
        const profile = (sel && sel.value) || featureState.footProfile || 'neutral'
        const nTricks = RUN_TECHNIQUE_TRICKS.length
        const base = Math.max(0, Number(featureState.tipIndex) || 0) % nTricks
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        const todayIdx = dayIndexMondayFirst()
        if (weekEl) {
          weekEl.innerHTML = ''
          for (let i = 0; i < 7; i++) {
            const trick = RUN_TECHNIQUE_TRICKS[(base + i) % nTricks]
            const shoe = shoeLineForProfile(profile, i)
            const block = document.createElement('div')
            block.className = 'plan-day' + (i === todayIdx ? ' plan-day-plan-today' : '')
            const label = document.createElement('div')
            label.className = 'plan-day-label'
            label.textContent = days[i] + (i === todayIdx ? ' · today' : '')
            const pTrick = document.createElement('p')
            pTrick.className = 'plan-trick'
            pTrick.textContent = 'Trick: ' + trick
            const pShoe = document.createElement('p')
            pShoe.className = 'plan-shoe'
            pShoe.textContent = 'Shoes: ' + shoe
            block.appendChild(label)
            block.appendChild(pTrick)
            block.appendChild(pShoe)
            weekEl.appendChild(block)
          }
        }
        if (todayEl) {
          const tTrick = RUN_TECHNIQUE_TRICKS[(base + todayIdx) % nTricks]
          const tShoe = shoeLineForProfile(profile, todayIdx)
          todayEl.textContent =
            'Today — Trick: ' + tTrick + ' · Shoes: ' + tShoe
        }
      }

      function renderHeartRateCard() {
        const zoneEl = document.getElementById('hrZoneText')
        const histEl = document.getElementById('hrHistoryText')
        if (!zoneEl || !histEl) return
        const list = featureState.hrReadings.slice(-5)
        if (!list.length) {
          if (!hrBtCharacteristic) zoneEl.textContent = 'No reading yet.'
          histEl.textContent = 'History: —'
          return
        }
        const latest = list[list.length - 1]
        const avg = list.reduce((s, r) => s + Number(r.bpm || 0), 0) / list.length
        if (!hrBtCharacteristic) {
          zoneEl.textContent = 'Latest: ' + latest.bpm + ' bpm · ' + inferHrZone(latest.bpm)
        }
        histEl.textContent = 'History: avg ' + Math.round(avg) + ' bpm across last ' + list.length + ' readings.'
      }

      function parseHeartRateMeasurement(view) {
        if (!view || view.byteLength < 2) return null
        const flags = view.getUint8(0)
        const hr16 = (flags & 0x1) !== 0
        let o = 1
        let bpm
        if (hr16) {
          if (view.byteLength < o + 2) return null
          bpm = view.getUint16(o, true)
          o += 2
        } else {
          bpm = view.getUint8(o)
          o += 1
        }
        return Number.isFinite(bpm) ? bpm : null
      }

      function dedupeHrReadings(arr) {
        const sorted = [...arr].sort((a, b) => a.t - b.t)
        const out = []
        let last = null
        for (const r of sorted) {
          if (
            last &&
            last.bpm === r.bpm &&
            Math.abs(last.t - r.t) < 2500
          ) {
            continue
          }
          out.push(r)
          last = r
        }
        return out
      }

      function pushHrReading(bpm, timeMs) {
        const n = Math.round(Number(bpm))
        const tRaw = timeMs != null ? Number(timeMs) : NaN
        const t = Number.isFinite(tRaw) ? Math.round(tRaw) : Date.now()
        if (!Number.isFinite(n) || n < 40 || n > 220) return false
        featureState.hrReadings.push({ bpm: n, t })
        featureState.hrReadings = dedupeHrReadings(featureState.hrReadings).slice(-HR_READINGS_MAX)
        writeFeatureState()
        renderHeartRateCard()
        return true
      }

      function normalizeCsvHeader(h) {
        return String(h || '')
          .trim()
          .replace(/^["']|["']$/g, '')
          .toLowerCase()
      }

      function splitCsvLine(line, delim) {
        const d = delim || ','
        const out = []
        let cur = ''
        let inQ = false
        for (let i = 0; i < line.length; i++) {
          const c = line[i]
          if (c === '"') {
            inQ = !inQ
            continue
          }
          if (!inQ && c === d) {
            out.push(cur)
            cur = ''
            continue
          }
          cur += c
        }
        out.push(cur)
        return out.map((s) => s.trim())
      }

      function detectCsvDelimiter(firstLine) {
        const commas = (firstLine.match(/,/g) || []).length
        const semis = (firstLine.match(/;/g) || []).length
        return semis > commas ? ';' : ','
      }

      function parseBpmCell(raw) {
        const s = String(raw || '').trim()
        const num = parseFloat(s.replace(/,/g, '.'))
        if (Number.isFinite(num) && num >= 30 && num <= 250) return Math.round(num)
        const m = s.match(/(\d{2,3})\s*(?:bpm|count\/min)?/i)
        if (m) return Math.round(Number(m[1]))
        const m2 = s.match(/\d+(?:\.\d+)?/)
        if (m2) {
          const v = Math.round(Number(m2[0]))
          return v >= 30 && v <= 250 ? v : NaN
        }
        return NaN
      }

      function parseTimeCell(raw) {
        const s = String(raw || '').trim()
        if (!s) return NaN
        const ms = Date.parse(s)
        if (Number.isFinite(ms)) return ms
        const n = Number(s)
        if (Number.isFinite(n)) {
          if (n > 1e12) return Math.round(n)
          if (n > 1e9) return Math.round(n * 1000)
        }
        return NaN
      }

      function guessHrCsvColumns(headers) {
        const norm = headers.map(normalizeCsvHeader)
        let bpmIdx = -1
        const bpmNames = ['heart rate', 'heartrate', 'heart_rate', 'bpm', 'pulse', 'avg hr', 'avg heart rate']
        for (let i = 0; i < norm.length; i++) {
          if (bpmNames.includes(norm[i]) || norm[i] === 'hr') {
            bpmIdx = i
            break
          }
        }
        if (bpmIdx < 0) {
          for (let i = 0; i < norm.length; i++) {
            if (norm[i] === 'value') {
              bpmIdx = i
              break
            }
          }
        }
        if (bpmIdx < 0) {
          for (let i = 0; i < norm.length; i++) {
            const h = norm[i]
            if (h.includes('heart') && h.includes('rate')) {
              bpmIdx = i
              break
            }
            if (h.endsWith('bpm')) {
              bpmIdx = i
              break
            }
          }
        }
        let timeIdx = -1
        const timePrefer = ['start', 'date', 'datetime', 'timestamp', 'time', 'end']
        for (const name of timePrefer) {
          const i = norm.indexOf(name)
          if (i >= 0) {
            timeIdx = i
            break
          }
        }
        if (timeIdx < 0) {
          for (let i = 0; i < norm.length; i++) {
            const h = norm[i]
            if (h.includes('start') || (h.includes('date') && !h.includes('update'))) {
              timeIdx = i
              break
            }
          }
        }
        const typeIdx = norm.indexOf('type')
        return { bpmIdx, timeIdx, typeIdx }
      }

      function parseHrCsvText(text) {
        const lines = text.split(/\r?\n/).filter((l) => String(l).trim().length)
        if (!lines.length) return []
        const delim = detectCsvDelimiter(lines[0])
        const headerCells = splitCsvLine(lines[0], delim)
        const headerNorm = headerCells.map(normalizeCsvHeader)
        const looksHeader =
          headerNorm.some((h) => /heart|bpm|rate|pulse|start|type|value|date|time/.test(h)) &&
          !/^(\d+[.,]?\d*)$/.test(headerCells[0])
        let startRow = 0
        let headers = headerCells
        if (!looksHeader) {
          headers = []
          startRow = 0
        } else {
          startRow = 1
        }
        const col = headers.length ? guessHrCsvColumns(headers) : { bpmIdx: 0, timeIdx: -1, typeIdx: -1 }
        const out = []
        const baseTs = Date.now()
        let synthetic = 0
        for (let r = startRow; r < lines.length; r++) {
          const cells = splitCsvLine(lines[r], delim)
          if (!cells.length) continue
          if (
            col.typeIdx >= 0 &&
            cells[col.typeIdx] &&
            !normalizeCsvHeader(cells[col.typeIdx]).includes('heart')
          ) {
            continue
          }
          let bpm = NaN
          let t = NaN
          if (col.bpmIdx >= 0 && cells[col.bpmIdx] !== undefined) {
            bpm = parseBpmCell(cells[col.bpmIdx])
          } else {
            bpm = parseBpmCell(cells[0])
          }
          if (col.timeIdx >= 0 && cells[col.timeIdx] !== undefined) {
            t = parseTimeCell(cells[col.timeIdx])
          }
          if (!Number.isFinite(bpm) || bpm < 40 || bpm > 220) continue
          if (!Number.isFinite(t)) {
            synthetic += 1
            t = baseTs - synthetic * 60000
          }
          out.push({ bpm, t })
        }
        return out
      }

      function parseHrJsonText(text) {
        let root
        try {
          root = JSON.parse(text)
        } catch (_) {
          return []
        }
        const rows = []
        function pick(obj) {
          if (obj == null || typeof obj !== 'object') return
          const bpm =
            obj.bpm != null
              ? Number(obj.bpm)
              : obj.hr != null
                ? Number(obj.hr)
                : obj.heartRate != null
                  ? Number(obj.heartRate)
                  : obj.value != null
                    ? Number(obj.value)
                    : obj.count != null
                      ? Number(obj.count)
                      : NaN
          let t = NaN
          const ts =
            obj.t != null
              ? obj.t
              : obj.ts != null
                ? obj.ts
                : obj.timestamp != null
                  ? obj.timestamp
                  : obj.time != null
                    ? obj.time
                    : obj.start != null
                      ? obj.start
                      : obj.date
          if (ts != null) {
            if (typeof ts === 'number') {
              t = ts > 1e12 ? Math.round(ts) : ts > 1e9 ? Math.round(ts * 1000) : NaN
            } else {
              t = parseTimeCell(ts)
            }
          }
          if (Number.isFinite(bpm) && bpm >= 40 && bpm <= 220) {
            rows.push({
              bpm: Math.round(bpm),
              t: Number.isFinite(t) ? t : Date.now(),
            })
          }
        }
        if (Array.isArray(root)) {
          root.forEach((item) => {
            if (typeof item === 'number' && item >= 40 && item <= 220) {
              rows.push({ bpm: Math.round(item), t: Date.now() })
            } else if (item && typeof item === 'object') pick(item)
          })
          return rows
        }
        if (root && typeof root === 'object') {
          const nested = root.readings || root.samples || root.data || root.heartRate || root.records
          if (Array.isArray(nested)) {
            nested.forEach((item) => {
              if (typeof item === 'number' && item >= 40 && item <= 220) {
                rows.push({ bpm: Math.round(item), t: Date.now() })
              } else if (item && typeof item === 'object') pick(item)
            })
            return rows
          }
          pick(root)
        }
        return rows
      }

      function mergeImportedHrReadings(entries) {
        const valid = entries.filter(
          (e) =>
            e &&
            Number.isFinite(e.bpm) &&
            e.bpm >= 40 &&
            e.bpm <= 220 &&
            Number.isFinite(e.t)
        )
        if (!valid.length) return 0
        featureState.hrReadings = dedupeHrReadings([...featureState.hrReadings, ...valid]).slice(
          -HR_READINGS_MAX
        )
        writeFeatureState()
        renderHeartRateCard()
        return valid.length
      }

      async function importHrFromFile(file) {
        if (!file) return
        const name = (file.name || '').toLowerCase()
        const text = await file.text()
        let entries = []
        if (name.endsWith('.json') || /^\s*\[/.test(text) || /^\s*\{/.test(text)) {
          entries = parseHrJsonText(text)
        }
        if (!entries.length) {
          entries = parseHrCsvText(text)
        }
        const n = mergeImportedHrReadings(entries)
        if (!n) {
          showToast('No heart-rate readings found. Use CSV with a Heart rate/BPM/Value column or JSON array.', 'warn')
          return
        }
        showToast('Imported ' + n + ' heart-rate ' + (n === 1 ? 'reading' : 'readings') + '.', 'ok')
      }

      function updateHrWatchButtons() {
        const c = document.getElementById('hrWatchConnectBtn')
        const d = document.getElementById('hrWatchDisconnectBtn')
        const h = document.getElementById('hrWatchHint')
        const connected = !!(hrBtDevice && hrBtCharacteristic)
        if (c) c.disabled = connected
        if (d) d.disabled = !connected
        if (h) {
          if (connected) {
            h.textContent = 'Connected: ' + (hrBtDevice && hrBtDevice.name ? hrBtDevice.name : 'heart-rate device') + '.'
          } else if (!window.isSecureContext) {
            h.innerHTML =
              'Bluetooth watch connection needs a secure origin (<code>https</code> or <code>127.0.0.1</code>).'
          } else if (!navigator.bluetooth) {
            h.textContent = 'Web Bluetooth is not available in this browser. Use Chrome/Edge, import, or manual entry.'
          }
        }
      }

      function teardownHrBtListeners() {
        try {
          if (hrBtCharacteristic) {
            hrBtCharacteristic.removeEventListener('characteristicvaluechanged', handleHrMeasurement)
            hrBtCharacteristic.stopNotifications()
          }
        } catch (_) {}
        hrBtCharacteristic = null
        try {
          if (hrBtDevice) hrBtDevice.removeEventListener('gattserverdisconnected', handleHrBtDisconnected)
        } catch (_) {}
        hrBtDevice = null
        hrWatchLastLogMs = 0
      }

      function handleHrBtDisconnected() {
        teardownHrBtListeners()
        updateHrWatchButtons()
        const live = document.getElementById('hrLiveBpm')
        if (live) live.textContent = '—'
        renderHeartRateCard()
      }

      async function disconnectHrWatch(opts) {
        const silent = opts && opts.silent
        const dev = hrBtDevice
        teardownHrBtListeners()
        try {
          if (dev && dev.gatt && dev.gatt.connected) dev.gatt.disconnect()
        } catch (_) {}
        updateHrWatchButtons()
        const live = document.getElementById('hrLiveBpm')
        if (live) live.textContent = '—'
        renderHeartRateCard()
        if (!silent) showToast('Watch disconnected.', 'ok')
      }

      function handleHrMeasurement(event) {
        const v = event.target && event.target.value
        if (!v) return
        const view = new DataView(v.buffer, v.byteOffset, v.byteLength)
        const bpm = parseHeartRateMeasurement(view)
        if (bpm == null || bpm < 30 || bpm > 250) return
        const rounded = Math.round(bpm)
        const live = document.getElementById('hrLiveBpm')
        if (live) live.textContent = String(rounded)
        const zoneEl = document.getElementById('hrZoneText')
        if (zoneEl) zoneEl.textContent = 'Watch live: ' + rounded + ' bpm · ' + inferHrZone(rounded)
        const autolog = document.getElementById('hrWatchAutoLog')
        if (autolog && autolog.checked) {
          const now = Date.now()
          if (now - hrWatchLastLogMs > 14000) {
            hrWatchLastLogMs = now
            pushHrReading(rounded)
          }
        }
      }

      async function startHrWatchNotifications(device) {
        const server = await device.gatt.connect()
        const service = await server.getPrimaryService(HR_BT_SERVICE)
        const characteristic = await service.getCharacteristic(HR_BT_MEASUREMENT)
        hrBtDevice = device
        hrBtCharacteristic = characteristic
        featureState.hrWatchDeviceId = device.id || ''
        writeFeatureState()
        device.addEventListener('gattserverdisconnected', handleHrBtDisconnected)
        characteristic.addEventListener('characteristicvaluechanged', handleHrMeasurement)
        await characteristic.startNotifications()
        updateHrWatchButtons()
      }

      async function connectHrWatch() {
        if (!window.isSecureContext) {
          showToast('Bluetooth requires a secure origin (https or 127.0.0.1).', 'warn')
          return
        }
        if (!navigator.bluetooth) {
          showToast('Web Bluetooth is not available in this browser. Try Chrome or Edge.', 'warn')
          return
        }
        if (hrBtDevice || hrBtCharacteristic) await disconnectHrWatch({ silent: true })
        try {
          const device = await navigator.bluetooth.requestDevice({
            filters: [{ namePrefix: 'allRunners' }, { services: [HR_BT_SERVICE] }],
            optionalServices: [HR_BT_SERVICE],
          })
          await startHrWatchNotifications(device)
          showToast('Connected to ' + (device.name || 'allRunners') + '.', 'ok')
        } catch (e) {
          if (e && e.name === 'NotFoundError') return
          const msg = (e && e.message) || String(e)
          showToast('Could not connect: ' + msg, 'warn')
        }
      }

      async function reconnectSavedHrWatch() {
        if (!window.isSecureContext || !navigator.bluetooth || typeof navigator.bluetooth.getDevices !== 'function') return
        const savedId = String(featureState.hrWatchDeviceId || '').trim()
        if (!savedId || hrBtCharacteristic) return
        try {
          const devices = await navigator.bluetooth.getDevices()
          const device = devices.find((d) => d && d.id === savedId)
          if (!device) return
          await startHrWatchNotifications(device)
          showToast('Reconnected to ' + (device.name || 'heart rate device') + '.', 'ok')
        } catch (_) {}
      }

      function renderCommunityCard() {
        const countPill = document.getElementById('communityCountPill')
        const joinText = document.getElementById('communityJoinText')
        const joinBtn = document.getElementById('communityJoinBtn')
        const feed = document.getElementById('communityFeed')
        if (countPill) countPill.textContent = 'On this device'
        if (joinText) {
          joinText.textContent = featureState.joinedCommunity
            ? 'This log stays in this browser. Nothing here is sent to other people.'
            : 'Notes stay in this browser. They are not shared with other people.'
        }
        if (joinBtn) joinBtn.textContent = featureState.joinedCommunity ? 'Logging here' : 'Start private log'
        if (!feed) return
        feed.innerHTML = ''
        const posts = featureState.communityPosts.slice(-4).reverse()
        if (!posts.length) {
          const p = document.createElement('p')
          p.className = 'community-item'
          p.textContent = 'No notes yet. Anything you write stays on this device.'
          feed.appendChild(p)
          return
        }
        posts.forEach((post) => {
          const p = document.createElement('p')
          p.className = 'community-item'
          p.textContent = post
          feed.appendChild(p)
        })
      }

      function renderStreakChallengeCard() {
        const streakEl = document.getElementById('streakText')
        const progEl = document.getElementById('challengeProgressText')
        const statusEl = document.getElementById('challengeStatusText')
        const friendInput = document.getElementById('friendHandleInput')
        if (friendInput && !friendInput.value && featureState.friendHandle) friendInput.value = featureState.friendHandle
        const streak = computeRunStreak()
        const weekly = computeWeeklySummary()
        const targetKm = 20
        const pct = Math.max(0, Math.min(100, Math.round((weekly.sumKm / targetKm) * 100)))
        if (streakEl) streakEl.textContent = 'Current streak: ' + streak + ' day' + (streak === 1 ? '' : 's') + '.'
        if (progEl) progEl.textContent = 'Weekly goal: ' + pct + '% of ' + targetKm + ' km (' + formatKmForUser(weekly.sumKm) + ').'
        const today = localDateStamp()
        if (statusEl) {
          if (featureState.challengeDay === today && featureState.friendHandle) {
            statusEl.textContent =
              'Reminder saved on this device for ' + featureState.friendHandle + '. Nothing was sent.'
          } else {
            statusEl.textContent = 'A name saved here is a personal reminder. It is not sent to anyone.'
          }
        }
      }

      function setAppleMusicStatus(text, ok) {
        const el = document.getElementById('appleMusicStatusText')
        if (!el) return
        el.textContent = text
        el.style.color = ok ? '#166534' : ''
      }

      function updateMusicSourceUi() {
        const sel = document.getElementById('musicSourceSelect')
        const setup = document.getElementById('musicAppleSetup')
        const trackSel = document.getElementById('musicTrackSelect')
        if (sel) sel.value = musicSource
        if (setup) setup.hidden = musicSource !== 'apple'
        if (trackSel) trackSel.disabled = musicSource === 'apple'
      }

      function setMusicSource(mode) {
        musicSource = mode === 'apple' ? 'apple' : 'local'
        featureState.musicSource = musicSource
        writeFeatureState()
        updateMusicSourceUi()
        if (musicSource === 'apple') {
          if (musicAudioEl && !musicAudioEl.paused) musicAudioEl.pause()
          setMusicNowText('Apple Music mode active. Initialize + authorize to control playback.')
        } else {
          const track = getMusicTrackById(musicCurrentId) || MUSIC_LIBRARY[0]
          setMusicNowText('Local mode · ' + musicDisplayName(track))
        }
      }

      function loadAppleMusicScript() {
        if (window.MusicKit) return Promise.resolve()
        if (appleMusicScriptPromise) return appleMusicScriptPromise
        appleMusicScriptPromise = new Promise((resolve, reject) => {
          const existing = document.querySelector('script[data-musickit="1"]')
          if (existing) {
            existing.addEventListener('load', () => resolve())
            existing.addEventListener('error', () => reject(new Error('MusicKit script failed to load')))
            return
          }
          const s = document.createElement('script')
          s.src = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js'
          s.async = true
          s.dataset.musickit = '1'
          s.onload = () => resolve()
          s.onerror = () => reject(new Error('MusicKit script failed to load'))
          document.head.appendChild(s)
        })
        return appleMusicScriptPromise
      }

      function appleNowPlayingDescriptor() {
        if (!appleMusicKit || !appleMusicKit.nowPlayingItem) return null
        const item = appleMusicKit.nowPlayingItem
        const id = String(item.id || item.playParams?.id || '')
        const title = String(item.title || item.attributes?.name || 'Apple track')
        const artist = String(item.artistName || item.attributes?.artistName || 'Unknown artist')
        return { id, title, subtitle: artist, source: 'apple' }
      }

      function rememberRecentDescriptor(desc) {
        if (!desc || !desc.id) return
        const key = String(desc.source || 'local') + ':' + String(desc.id)
        const next = [desc]
          .concat((featureState.musicRecent || []).filter((x) => String((x?.source || 'local') + ':' + String(x?.id || '')) !== key))
          .slice(0, 8)
        featureState.musicRecent = next
        writeFeatureState()
        renderMusicRecent()
      }

      async function initAppleMusicKit() {
        const tokenInput = document.getElementById('appleDevTokenInput')
        const token = String((tokenInput && tokenInput.value) || localStorage.getItem(APPLE_DEV_TOKEN_KEY) || '').trim()
        if (!token) {
          setAppleMusicStatus('Paste your Apple developer token, then tap Init.', false)
          return false
        }
        try {
          await loadAppleMusicScript()
          window.MusicKit.configure({
            developerToken: token,
            app: { name: 'allRunners', build: '1.0.0' },
          })
          appleMusicKit = window.MusicKit.getInstance()
          appleMusicReady = true
          appleMusicAuthorized = !!appleMusicKit.isAuthorized
          localStorage.setItem(APPLE_DEV_TOKEN_KEY, token)
          if (tokenInput && !tokenInput.value) tokenInput.value = token
          appleMusicKit.addEventListener(window.MusicKit.Events.playbackStateDidChange, () => {
            const d = appleNowPlayingDescriptor()
            if (d) {
              setMusicNowText((appleMusicKit.isPlaying ? 'Playing: ' : 'Paused: ') + d.title + ' · ' + d.subtitle)
              rememberRecentDescriptor(d)
            }
            setMusicPlayButton(!!appleMusicKit.isPlaying)
          })
          appleMusicKit.addEventListener(window.MusicKit.Events.mediaItemDidChange, () => {
            const d = appleNowPlayingDescriptor()
            if (d) {
              setMusicNowText('Playing: ' + d.title + ' · ' + d.subtitle)
              rememberRecentDescriptor(d)
            }
          })
          setAppleMusicStatus(
            appleMusicAuthorized ? 'Apple Music ready and already authorized.' : 'Apple Music initialized. Tap Authorize.',
            true
          )
          return true
        } catch (err) {
          setAppleMusicStatus('Apple Music init failed: ' + (err.message || 'unknown error'), false)
          return false
        }
      }

      async function ensureAppleReadyAndAuthorized() {
        if (!appleMusicReady) {
          const ok = await initAppleMusicKit()
          if (!ok) return false
        }
        if (!appleMusicKit) return false
        if (!appleMusicKit.isAuthorized) {
          try {
            await appleMusicKit.authorize()
            appleMusicAuthorized = true
            setAppleMusicStatus('Apple Music authorized.', true)
          } catch (_) {
            setAppleMusicStatus('Apple Music authorization canceled or failed.', false)
            return false
          }
        }
        return true
      }

      function getMusicTrackById(id) {
        return MUSIC_LIBRARY.find((t) => t.id === id) || null
      }

      function musicDisplayName(track) {
        if (!track) return 'Unknown track'
        return track.title + ' · ' + track.mood
      }

      function renderMusicRecent() {
        const wrap = document.getElementById('musicRecentList')
        if (!wrap) return
        wrap.innerHTML = ''
        const items = Array.isArray(featureState.musicRecent)
          ? featureState.musicRecent
              .map((x) => {
                if (x && typeof x === 'object' && x.id) return x
                if (typeof x === 'string') {
                  const t = getMusicTrackById(x)
                  return t ? { id: t.id, title: t.title, subtitle: t.mood, source: 'local' } : null
                }
                return null
              })
              .filter(Boolean)
              .slice(0, 8)
          : []
        if (!items.length) {
          const p = document.createElement('p')
          p.className = 'feature-note'
          p.style.margin = '0'
          p.textContent = 'No recently played tracks yet.'
          wrap.appendChild(p)
          return
        }
        items.forEach((item) => {
          const btn = document.createElement('button')
          btn.type = 'button'
          btn.className = 'music-recent-item'
          btn.dataset.trackId = String(item.id)
          btn.dataset.trackSource = String(item.source || 'local')
          btn.textContent =
            String(item.title || 'Track') +
            (item.subtitle ? ' · ' + item.subtitle : '') +
            (item.source === 'apple' ? ' (Apple)' : '')
          wrap.appendChild(btn)
        })
      }

      function setMusicNowText(text) {
        const el = document.getElementById('musicNowPlaying')
        if (el) el.textContent = text
      }

      function setMusicPlayButton(isPlaying) {
        const btn = document.getElementById('musicPlayPauseBtn')
        if (btn) btn.textContent = isPlaying ? 'Pause' : 'Play'
      }

      function rememberRecentTrack(id) {
        if (!id) return
        const t = getMusicTrackById(id)
        if (!t) return
        rememberRecentDescriptor({ id: t.id, title: t.title, subtitle: t.mood, source: 'local' })
      }

      function selectMusicTrackById(id, autoplay) {
        const track = getMusicTrackById(id)
        if (!track || !musicAudioEl) return
        musicCurrentId = track.id
        featureState.musicCurrent = track.id
        writeFeatureState()
        const sel = document.getElementById('musicTrackSelect')
        if (sel) sel.value = track.id
        if (musicAudioEl.src !== track.url) {
          musicAudioEl.src = track.url
          musicAudioEl.load()
        }
        setMusicNowText('Loaded: ' + musicDisplayName(track))
        if (autoplay) {
          musicAudioEl
            .play()
            .then(() => {
              setMusicPlayButton(true)
              setMusicNowText('Playing: ' + musicDisplayName(track))
              rememberRecentTrack(track.id)
            })
            .catch(() => {
              setMusicPlayButton(false)
              setMusicNowText('Tap Play to start: ' + musicDisplayName(track))
            })
        } else {
          setMusicPlayButton(false)
        }
      }

      function shiftMusicTrack(step) {
        if (!MUSIC_LIBRARY.length) return
        const curIdx = Math.max(
          0,
          MUSIC_LIBRARY.findIndex((t) => t.id === musicCurrentId)
        )
        const nextIdx = (curIdx + step + MUSIC_LIBRARY.length) % MUSIC_LIBRARY.length
        selectMusicTrackById(MUSIC_LIBRARY[nextIdx].id, true)
      }

      function setupMusicPlayer() {
        const audio = document.getElementById('musicAudio')
        const sel = document.getElementById('musicTrackSelect')
        if (!audio || !sel) return
        musicAudioEl = audio
        musicSource = featureState.musicSource === 'apple' ? 'apple' : 'local'
        updateMusicSourceUi()
        sel.innerHTML = ''
        MUSIC_LIBRARY.forEach((track) => {
          const opt = document.createElement('option')
          opt.value = track.id
          opt.textContent = musicDisplayName(track)
          sel.appendChild(opt)
        })
        const initial = getMusicTrackById(featureState.musicCurrent)
          ? featureState.musicCurrent
          : MUSIC_LIBRARY[0].id
        selectMusicTrackById(initial, false)
        renderMusicRecent()
        const savedDevToken = localStorage.getItem(APPLE_DEV_TOKEN_KEY) || ''
        const tokInput = document.getElementById('appleDevTokenInput')
        if (tokInput && savedDevToken) tokInput.value = savedDevToken
        if (musicSource === 'apple') {
          setMusicNowText('Apple Music mode active. Initialize + authorize to control playback.')
        }
        audio.addEventListener('play', () => {
          setMusicPlayButton(true)
          const t = getMusicTrackById(musicCurrentId)
          if (t) {
            setMusicNowText('Playing: ' + musicDisplayName(t))
            rememberRecentTrack(t.id)
          }
        })
        audio.addEventListener('pause', () => {
          if (!audio.ended) setMusicPlayButton(false)
        })
        audio.addEventListener('ended', () => {
          setMusicPlayButton(false)
          shiftMusicTrack(1)
        })
      }

      function renderTrailMonitor() {
        const modeEl = document.getElementById('mapTrailMode')
        if (modeEl) modeEl.value = mapTrailMode
        const durationEl = document.getElementById('monitorDuration')
        const distanceEl = document.getElementById('monitorDistance')
        const paceEl = document.getElementById('monitorPace')
        if (!durationEl || !distanceEl || !paceEl) return
        const meters = trailDistanceMeters()
        const mi = meters / 1609.344
        const km = meters / 1000
        const elapsed = mapTrailStartMs ? Date.now() - mapTrailStartMs : 0
        durationEl.textContent = formatElapsedClock(elapsed)
        distanceEl.textContent = preferredMiles() ? mi.toFixed(2) + ' mi' : km.toFixed(2) + ' km'
        if (meters < 20 || elapsed < 15000) {
          paceEl.textContent = '—'
        } else {
          const min = elapsed / 60000
          const paceMin = preferredMiles() ? min / Math.max(mi, 0.0001) : min / Math.max(km, 0.0001)
          const paceClock = formatPaceClock(paceMin)
          paceEl.textContent = paceClock ? paceClock + (preferredMiles() ? ' /mi' : ' /km') : '—'
        }
      }

      function startMonitorTicker() {
        if (monitorTicker !== null) return
        monitorTicker = window.setInterval(renderTrailMonitor, 1000)
      }

      function stopMonitorTicker() {
        if (monitorTicker === null) return
        window.clearInterval(monitorTicker)
        monitorTicker = null
      }

      function scheduleTrackReminder(minutes) {
        if (reminderTimer !== null) {
          window.clearTimeout(reminderTimer)
          reminderTimer = null
        }
        const delayMs = Math.max(1000, Math.round(Number(minutes) * 60000))
        reminderTimer = window.setTimeout(() => {
          sendTrackReminder()
          reminderTimer = null
        }, delayMs)
      }

      function sendTrackReminder() {
        const msg = 'No slacking allowed get back to the track'
        if ('Notification' in window) {
          if (Notification.permission === 'granted') {
            try {
              new Notification('allRunners Reminder', { body: msg })
            } catch (_) {}
          } else if (Notification.permission === 'default') {
            Notification.requestPermission().then((perm) => {
              if (perm === 'granted') {
                try {
                  new Notification('allRunners Reminder', { body: msg })
                } catch (_) {}
              }
            })
          }
        }
        showToast(msg, 'warn')
        log('Reminder: ' + msg)
      }

      async function sha256HexUtf8(text) {
        const data = new TextEncoder().encode(text)
        const buf = await crypto.subtle.digest('SHA-256', data)
        const bytes = Array.from(new Uint8Array(buf))
        return bytes.map((b) => b.toString(16).padStart(2, '0')).join('')
      }

      async function stableExternalId(dateStr, distanceMi, timeMin) {
        const d = Number(distanceMi)
        const t = Number(timeMin)
        const raw =
          'allrunners|' + String(dateStr || '').trim() + '|' + (Number.isFinite(d) ? d.toFixed(5) : '') + '|' + (Number.isFinite(t) ? t.toFixed(5) : '')
        if (globalThis.crypto && crypto.subtle && typeof crypto.subtle.digest === 'function') {
          const hex = await sha256HexUtf8(raw)
          return 'allrunners-' + hex.slice(0, 24)
        }
        let h = 5381
        for (let i = 0; i < raw.length; i++) {
          h = (h * 33) ^ raw.charCodeAt(i)
        }
        const hexFallback = Math.abs(h).toString(16).padStart(12, '0').slice(0, 24)
        return 'allrunners-' + hexFallback
      }

      function preferredMiles() {
        const u = userProfile && userProfile.unitDistance
        return String(u || 'm').toLowerCase() !== 'k'
      }

      function formatKmForUser(km) {
        if (!Number.isFinite(km)) return '—'
        if (preferredMiles()) return (km / 1.609344).toFixed(2) + ' mi'
        return km.toFixed(2) + ' km'
      }

      function formatUtcClock(tsSec) {
        if (!Number.isFinite(tsSec) || tsSec <= 0) return '—'
        try {
          const d = new Date(tsSec * 1000)
          return d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC')
        } catch (_) {
          return '—'
        }
      }

      function mergeRunsById(existing, incoming) {
        const map = Object.create(null)
        function add(run) {
          if (!run || run.id === undefined || run.id === null || String(run.id) === '') return
          const k = String(run.id)
          const prev = map[k]
          if (!prev) {
            map[k] = Object.assign({}, run)
            return
          }
          const a = Number(prev._modifiedUtc)
          const b = Number(run._modifiedUtc)
          if (Number.isFinite(b) && (!Number.isFinite(a) || b >= a)) {
            map[k] = Object.assign({}, prev, run)
          }
        }
        existing.forEach(add)
        incoming.forEach(add)
        const out = Object.keys(map).map((k) => map[k])
        out.sort((a, b) => {
          const da = String(a.date || '')
          const db = String(b.date || '')
          if (da !== db) return db.localeCompare(da)
          const ia = Number(a.id)
          const ib = Number(b.id)
          if (Number.isFinite(ia) && Number.isFinite(ib) && ia !== ib) return ib - ia
          return String(b.id).localeCompare(String(a.id))
        })
        return out
      }

      function maxWatermarkFromRuns(list) {
        let m = 0
        list.forEach((r) => {
          const v = Number(r && r._modifiedUtc)
          if (Number.isFinite(v) && v > m) m = v
        })
        return m
      }

      function localOnlyRuns(list) {
        return (list || []).filter((r) => !r || r.id === undefined || r.id === null || String(r.id) === '')
      }

      const ICON_TRASH =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" aria-hidden="true">' +
        '<path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" stroke-linecap="round" stroke-linejoin="round"/></svg>'

      function stopMapFollow() {
        if (mapWatchId !== null && navigator.geolocation) {
          navigator.geolocation.clearWatch(mapWatchId)
          mapWatchId = null
        }
        const fb = document.getElementById('mapFollowBtn')
        if (fb) fb.textContent = 'Follow me'
      }

      function readTrailsStore() {
        try {
          const raw = localStorage.getItem(TRAILS_STORAGE_KEY)
          if (!raw) return {}
          const parsed = JSON.parse(raw)
          return parsed && typeof parsed === 'object' ? parsed : {}
        } catch (_) {
          return {}
        }
      }

      function writeTrailsStore(store) {
        try {
          localStorage.setItem(TRAILS_STORAGE_KEY, JSON.stringify(store))
          return true
        } catch (_) {
          return false
        }
      }

      function readTrailAutoSyncPref() {
        try {
          return localStorage.getItem(TRAILS_SYNC_PREF_KEY) === '1'
        } catch (_) {
          return false
        }
      }

      function writeTrailAutoSyncPref(enabled) {
        try {
          localStorage.setItem(TRAILS_SYNC_PREF_KEY, enabled ? '1' : '0')
        } catch (_) {}
      }

      function trailSyncStateLabel(state) {
        const s = String(state || 'local')
        if (s === 'uploaded') return 'synced'
        if (s === 'notes_fallback') return 'synced (notes)'
        if (s === 'queued') return 'queued'
        if (s === 'syncing') return 'syncing'
        if (s === 'failed') return 'failed'
        return 'local only'
      }

      function setTrailSyncStatusText(text) {
        const el = document.getElementById('mapTrailSyncStatus')
        if (el) el.textContent = text
      }

      function getTrailEntry(run, index, store) {
        const s = store || readTrailsStore()
        return s[trailRunKey(run, index)] || null
      }

      function updateTrailEntry(run, index, updater) {
        const store = readTrailsStore()
        const key = trailRunKey(run, index)
        const prev = store[key] && typeof store[key] === 'object' ? store[key] : {}
        store[key] = Object.assign({}, prev, updater)
        const ok = writeTrailsStore(store)
        return ok ? store[key] : null
      }

      function trailRunKey(run, index) {
        if (run && run.id !== undefined && run.id !== null && String(run.id) !== '') {
          return 'id:' + String(run.id)
        }
        return 'fp:' + [run.date || '', run.distance || '', run.time || '', index].join('|')
      }

      function trailRunLabel(run, index) {
        const du = preferredMiles()
          ? (run.distance != null ? run.distance : '?') + ' mi'
          : (run.distance != null ? (Number(run.distance) * 1.609344).toFixed(2) : '?') + ' km'
        return 'Run ' + (index + 1) + ' · ' + (run.date || 'date?') + ' · ' + du
      }

      function sanitizeTrailPoints(points) {
        if (!Array.isArray(points)) return []
        const out = []
        points.forEach((p) => {
          const lat = Number(p && p.lat)
          const lon = Number(p && p.lon)
          if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
            out.push({ lat, lon, t: Number(p.t || Date.now()) })
          }
        })
        return out
      }

      function ensureRunMap() {
        if (typeof L === 'undefined') {
          const st = document.getElementById('mapStatus')
          if (st) st.textContent = 'Map could not load. Check your network and refresh the page.'
          return null
        }
        if (runMapInstance) return runMapInstance
        runMapInstance = L.map('runMap', { zoomControl: true }).setView([39.8, -98.5], 4)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(runMapInstance)
        return runMapInstance
      }

      function clearMapUserLayers(map) {
        if (mapUserMarker) {
          map.removeLayer(mapUserMarker)
          mapUserMarker = null
        }
        if (mapAccuracyCircle) {
          map.removeLayer(mapAccuracyCircle)
          mapAccuracyCircle = null
        }
      }

      function showPositionOnRunMap(pos) {
        const map = ensureRunMap()
        if (!map) return
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        const acc = pos.coords.accuracy
        const ll = [lat, lon]
        clearMapUserLayers(map)
        mapUserMarker = L.marker(ll).addTo(map).bindPopup('You are here')
        if (acc && acc > 2 && acc < 50000) {
          mapAccuracyCircle = L.circle(ll, {
            radius: acc,
            color: '#0ea5e9',
            fillColor: '#38bdf8',
            fillOpacity: 0.12,
            weight: 1,
          }).addTo(map)
        }
        map.setView(ll, 15)
        const coordEl = document.getElementById('mapCoordLine')
        if (coordEl) {
          coordEl.textContent =
            lat.toFixed(6) +
            ', ' +
            lon.toFixed(6) +
            (acc ? ' · GPS ±' + Math.round(acc) + ' m' : '')
        }
      }

      function clearTrailOverlay() {
        const map = ensureRunMap()
        if (!map) return
        if (mapTrailPolyline) {
          map.removeLayer(mapTrailPolyline)
          mapTrailPolyline = null
        }
      }

      function drawTrailOverlay(fitBounds = false) {
        const map = ensureRunMap()
        if (!map) return
        clearTrailOverlay()
        if (mapTrailPoints.length < 2) return
        const color = mapTrailMode === 'walk' ? '#22c55e' : '#f59e0b'
        mapTrailPolyline = L.polyline(
          mapTrailPoints.map((p) => [p.lat, p.lon]),
          {
            color,
            weight: 4,
            opacity: 0.92,
          }
        ).addTo(map)
        if (fitBounds) map.fitBounds(mapTrailPolyline.getBounds(), { padding: [20, 20] })
      }

      function setTrailStatus(text) {
        const el = document.getElementById('mapStatus')
        if (el) el.textContent = text
      }

      function updateTrailButtons() {
        const startBtn = document.getElementById('mapTrailStartBtn')
        const stopBtn = document.getElementById('mapTrailStopBtn')
        const saveBtn = document.getElementById('mapTrailSaveBtn')
        if (startBtn) startBtn.disabled = mapTrailTracking
        if (stopBtn) stopBtn.disabled = !mapTrailTracking
        if (saveBtn) saveBtn.disabled = mapTrailPoints.length < 2
      }

      function refreshTrailRunSelect() {
        const sel = document.getElementById('mapTrailRunSelect')
        if (!sel) return
        const prev = sel.value
        const store = readTrailsStore()
        sel.innerHTML = '<option value="">Select run for trail…</option>'
        runs.forEach((run, i) => {
          const opt = document.createElement('option')
          opt.value = String(i)
          const entry = getTrailEntry(run, i, store)
          const syncState = entry && entry.sync_state ? ' · ' + trailSyncStateLabel(entry.sync_state) : ''
          opt.textContent = trailRunLabel(run, i) + syncState
          sel.appendChild(opt)
        })
        if (prev && sel.querySelector('option[value="' + prev + '"]')) sel.value = prev
      }

      function hasSavedTrail(run, index, store) {
        const key = trailRunKey(run, index)
        const s = store || readTrailsStore()
        return !!(s[key] && Array.isArray(s[key].points) && s[key].points.length >= 2)
      }

      function appendTrailPointFromPosition(pos) {
        const map = ensureRunMap()
        if (!map) return
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        const point = { lat, lon, t: Date.now() }
        if (mapTrailPoints.length > 0) {
          const last = mapTrailPoints[mapTrailPoints.length - 1]
          const dist = map.distance([last.lat, last.lon], [lat, lon])
          const minStep = mapTrailMode === 'walk' ? 1.5 : 3
          if (dist < minStep) return
        }
        mapTrailPoints.push(point)
        drawTrailOverlay(false)
        updateTrailButtons()
        renderTrailMonitor()
      }

      function stopTrailRecording(statusText) {
        if (mapTrailWatchId !== null && navigator.geolocation) {
          navigator.geolocation.clearWatch(mapTrailWatchId)
          mapTrailWatchId = null
        }
        mapTrailTracking = false
        updateTrailButtons()
        stopMonitorTicker()
        renderTrailMonitor()
        if (statusText) setTrailStatus(statusText)
      }

      function startTrailRecording() {
        if (!navigator.geolocation) {
          setTrailStatus('Geolocation is not available in this browser.')
          return
        }
        stopMapFollow()
        mapTrailPoints = []
        mapTrailStartMs = Date.now()
        clearTrailOverlay()
        mapTrailTracking = true
        updateTrailButtons()
        startMonitorTicker()
        renderTrailMonitor()
        setTrailStatus('Recording ' + mapTrailMode + ' trail… move to capture GPS points.')
        mapTrailWatchId = navigator.geolocation.watchPosition(
          (pos) => {
            showPositionOnRunMap(pos)
            appendTrailPointFromPosition(pos)
          },
          () => {
            stopTrailRecording('Trail recording stopped — location error.')
          },
          { enableHighAccuracy: true, maximumAge: 1000, timeout: 30000 }
        )
      }

      function loadSavedTrailForIndex(index, fitBounds = true) {
        const run = runs[index]
        if (!run) return false
        const store = readTrailsStore()
        const saved = store[trailRunKey(run, index)]
        if (!saved || !Array.isArray(saved.points)) return false
        mapTrailPoints = sanitizeTrailPoints(saved.points)
        if (mapTrailPoints.length < 2) return false
        mapTrailMode = saved.mode === 'walk' ? 'walk' : 'run'
        mapTrailStartMs = mapTrailPoints[0].t || Date.now()
        drawTrailOverlay(fitBounds)
        updateTrailButtons()
        renderTrailMonitor()
        setTrailStatus('Loaded saved trail for ' + trailRunLabel(run, index) + '.')
        setTrailSyncStatusText('Trail sync status: ' + trailSyncStateLabel(saved.sync_state) + '.')
        const sel = document.getElementById('mapTrailRunSelect')
        if (sel) sel.value = String(index)
        return true
      }

      function saveTrailForSelectedRun() {
        const sel = document.getElementById('mapTrailRunSelect')
        if (!sel || sel.value === '') {
          setTrailStatus('Pick a run in the dropdown before saving a trail.')
          return
        }
        if (mapTrailPoints.length < 2) {
          setTrailStatus('Record at least 2 points before saving.')
          return
        }
        const idx = parseInt(sel.value, 10)
        const run = runs[idx]
        if (!run) {
          setTrailStatus('Selected run is not available.')
          return
        }
        const store = readTrailsStore()
        store[trailRunKey(run, idx)] = {
          name: trailRunLabel(run, idx),
          points: mapTrailPoints,
          saved_at: Date.now(),
          mode: mapTrailMode,
          sync_state: 'local',
          sync_error: '',
          sync_updated_at: Date.now(),
        }
        if (!writeTrailsStore(store)) {
          setTrailStatus('Could not save trail in browser storage.')
          return
        }
        setTrailStatus('Trail saved for ' + trailRunLabel(run, idx) + '.')
        setTrailSyncStatusText('Trail sync status: local only.')
        showToast('Trail saved in this browser for that run (not sent to Smashrun).', 'ok')
        renderRunsList()
        if (readTrailAutoSyncPref()) {
          syncTrailForRunIndex(idx, { silent: true })
        }
      }

      async function syncTrailForRunIndex(index, opts) {
        const run = runs[index]
        if (!run) return false
        const options = opts || {}
        const store = readTrailsStore()
        const key = trailRunKey(run, index)
        const entry = store[key]
        if (!entry || !Array.isArray(entry.points) || entry.points.length < 2) {
          if (!options.silent) showToast('No saved trail to sync for this run.', 'warn')
          return false
        }
        if (!run.id) {
          updateTrailEntry(run, index, {
            sync_state: 'failed',
            sync_error: 'Run has no Smashrun activity id yet.',
            sync_updated_at: Date.now(),
          })
          renderRunsList()
          setTrailSyncStatusText('Trail sync status: failed (missing activity id).')
          return false
        }
        updateTrailEntry(run, index, {
          sync_state: 'syncing',
          sync_error: '',
          sync_updated_at: Date.now(),
        })
        renderRunsList()
        setTrailSyncStatusText('Trail sync status: syncing…')
        try {
          const data = await apiJson('/api/runs/' + encodeURIComponent(run.id) + '/trail-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: entry.name || trailRunLabel(run, index),
              mode: entry.mode || mapTrailMode || 'run',
              points: entry.points,
              saved_at: entry.saved_at || Date.now(),
            }),
          })
          const syncState = String(data.sync_state || 'uploaded')
          updateTrailEntry(run, index, {
            sync_state: syncState,
            sync_error: '',
            sync_updated_at: Date.now(),
          })
          renderRunsList()
          const label = trailSyncStateLabel(syncState)
          setTrailSyncStatusText('Trail sync status: ' + label + '.')
          if (!options.silent) {
            showToast(
              syncState === 'local'
                ? 'Trail note saved on this device.'
                : syncState === 'notes_fallback'
                  ? 'Trail sync stored as notes metadata on Smashrun.'
                  : 'Trail synced to Smashrun.',
              'ok'
            )
          }
          return true
        } catch (err) {
          updateTrailEntry(run, index, {
            sync_state: 'failed',
            sync_error: String(err && err.message ? err.message : 'sync_failed'),
            sync_updated_at: Date.now(),
          })
          renderRunsList()
          setTrailSyncStatusText('Trail sync status: failed. Retry when connected.')
          if (!options.silent) showToast('Trail sync failed: ' + (err.message || 'request failed'), 'warn')
          return false
        }
      }

      async function syncSelectedTrail() {
        const sel = document.getElementById('mapTrailRunSelect')
        if (!sel || sel.value === '') {
          setTrailSyncStatusText('Trail sync status: pick a run first.')
          return
        }
        const idx = parseInt(sel.value, 10)
        if (Number.isNaN(idx)) return
        await syncTrailForRunIndex(idx, { silent: false })
      }

      async function retryFailedTrailSyncs() {
        const store = readTrailsStore()
        const failed = []
        runs.forEach((run, i) => {
          const e = getTrailEntry(run, i, store)
          if (!e) return
          if (String(e.sync_state || '') === 'failed' || String(e.sync_state || '') === 'queued') {
            failed.push(i)
          }
        })
        if (!failed.length) {
          setTrailSyncStatusText('Trail sync status: no failed trails to retry.')
          return
        }
        let okCount = 0
        for (const idx of failed) {
          // eslint-disable-next-line no-await-in-loop
          const ok = await syncTrailForRunIndex(idx, { silent: true })
          if (ok) okCount += 1
        }
        showToast('Trail retry complete: ' + okCount + '/' + failed.length + ' synced.', okCount ? 'ok' : 'warn')
      }

      function refreshRunMapLayout() {
        const map = ensureRunMap()
        if (!map) return
        setTimeout(() => {
          map.invalidateSize()
          if (mapTrailPolyline) {
            map.fitBounds(mapTrailPolyline.getBounds(), { padding: [20, 20] })
            return
          }
          if (mapUserMarker) {
            const ll = mapUserMarker.getLatLng()
            map.setView(ll, Math.max(map.getZoom(), 14))
          }
        }, 200)
      }

      function centerMapOnUser() {
        const status = document.getElementById('mapStatus')
        if (typeof L === 'undefined') {
          if (status) status.textContent = 'Map could not load. Check your network and refresh the page.'
          return
        }
        if (!navigator.geolocation) {
          if (status) status.textContent = 'Geolocation is not available in this browser.'
          return
        }
        if (status) status.textContent = 'Requesting GPS…'
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            showPositionOnRunMap(pos)
            if (status) {
              status.textContent =
                'Centered on your location. Tap Follow me to update as you move (uses more battery).'
            }
            log(
              'Map: GPS ' +
                pos.coords.latitude.toFixed(5) +
                ', ' +
                pos.coords.longitude.toFixed(5)
            )
          },
          () => {
            if (status) {
              status.textContent =
                'GPS unavailable — allow location for this site in your browser (address bar lock icon).'
            }
          },
          { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 }
        )
      }

      function toggleMapFollow() {
        const btn = document.getElementById('mapFollowBtn')
        const status = document.getElementById('mapStatus')
        if (typeof L === 'undefined') {
          if (status) status.textContent = 'Map could not load. Check your network and refresh the page.'
          return
        }
        if (mapWatchId !== null) {
          stopMapFollow()
          if (status) status.textContent = 'Stopped following. Tiles © OpenStreetMap contributors.'
          return
        }
        if (!navigator.geolocation) return
        ensureRunMap()
        if (status) status.textContent = 'Following your position…'
        mapWatchId = navigator.geolocation.watchPosition(
          (pos) => {
            showPositionOnRunMap(pos)
          },
          () => {
            if (status) status.textContent = 'Follow stopped — location error.'
            stopMapFollow()
          },
          { enableHighAccuracy: true, maximumAge: 3000, timeout: 30000 }
        )
        if (btn) btn.textContent = 'Stop'
      }

      function setTab(name) {
        if (previousTabName === 'map' && name !== 'map') {
          stopMapFollow()
          if (mapTrailTracking) stopTrailRecording('Trail recording stopped (left Map tab).')
        }
        previousTabName = name

        const panelMap = {
          home: 'tab-home',
          runs: 'tab-runs',
          search: 'tab-search',
          map: 'tab-map',
          settings: 'tab-settings',
          log: 'tab-log',
        }
        for (const key of Object.keys(panelMap)) {
          const panel = document.getElementById(panelMap[key])
          const active = key === name
          panel.classList.toggle('is-active', active)
          panel.setAttribute('aria-hidden', active ? 'false' : 'true')
        }
        document.querySelectorAll('.bottom-tab').forEach((btn) => {
          const active = btn.dataset.tab === name
          btn.classList.toggle('is-active', active)
          btn.setAttribute('aria-selected', active ? 'true' : 'false')
        })
        const compactLog = document.querySelector('.session-log-strip')
        if (compactLog) compactLog.hidden = name === 'log'

        if (name === 'map') {
          refreshTrailRunSelect()
          updateTrailButtons()
          refreshRunMapLayout()
        }
        if (name === 'home') {
          const dash = document.getElementById('smashrunDash')
          if (dash && !dash.hidden) refreshDashboard().catch(() => {})
        }
      }

      document.getElementById('tabBtnHome').addEventListener('click', () => setTab('home'))
      document.getElementById('tabBtnRuns').addEventListener('click', () => {
        setTab('runs')
        syncRunsFromBackend(false)
      })
      document.getElementById('tabBtnSearch').addEventListener('click', () => setTab('search'))
      document.getElementById('tabBtnMap').addEventListener('click', () => setTab('map'))
      document.getElementById('tabBtnSettings').addEventListener('click', () => {
        setTab('settings')
        refreshServiceKeyStatus()
        refreshSmashrunStatus()
      })
      document.getElementById('tabBtnLog').addEventListener('click', () => setTab('log'))

      document.getElementById('mapCenterBtn').addEventListener('click', centerMapOnUser)
      document.getElementById('mapFollowBtn').addEventListener('click', toggleMapFollow)
      document.getElementById('mapTrailStartBtn').addEventListener('click', startTrailRecording)
      document.getElementById('mapTrailStopBtn').addEventListener('click', () => {
        const n = mapTrailPoints.length
        stopTrailRecording(
          n > 1 ? 'Trail recording stopped. ' + n + ' points captured.' : 'Trail recording stopped.'
        )
      })
      document.getElementById('mapTrailClearBtn').addEventListener('click', () => {
        if (mapTrailTracking) stopTrailRecording('')
        mapTrailPoints = []
        mapTrailStartMs = null
        clearTrailOverlay()
        updateTrailButtons()
        renderTrailMonitor()
        setTrailStatus('Cleared current trail overlay.')
      })
      document.getElementById('mapTrailMode').addEventListener('change', (e) => {
        mapTrailMode = e.target.value === 'walk' ? 'walk' : 'run'
        drawTrailOverlay(false)
        renderTrailMonitor()
        setTrailStatus(
          mapTrailMode === 'walk'
            ? 'Walk mode enabled. Trail captures slower movement.'
            : 'Run mode enabled. Trail tuned for running pace.'
        )
      })
      document.getElementById('mapTrailSaveBtn').addEventListener('click', saveTrailForSelectedRun)
      document.getElementById('mapTrailSyncBtn').addEventListener('click', () => {
        syncSelectedTrail()
      })
      document.getElementById('mapTrailRetryBtn').addEventListener('click', () => {
        retryFailedTrailSyncs()
      })
      document.getElementById('mapTrailAutoSync').addEventListener('change', (e) => {
        writeTrailAutoSyncPref(!!e.target.checked)
        setTrailSyncStatusText(
          e.target.checked ? 'Trail sync status: auto-sync enabled.' : 'Trail sync status: auto-sync disabled.'
        )
      })
      document.getElementById('mapTrailLoadBtn').addEventListener('click', () => {
        const sel = document.getElementById('mapTrailRunSelect')
        if (!sel || sel.value === '') {
          setTrailStatus('Pick a run in the dropdown before loading a trail.')
          return
        }
        const idx = parseInt(sel.value, 10)
        if (!loadSavedTrailForIndex(idx, true)) {
          setTrailStatus('No saved trail for that run yet.')
        }
      })
      document.getElementById('mapTrailRunSelect').addEventListener('change', (e) => {
        const idx = parseInt(String(e.target.value || ''), 10)
        if (Number.isNaN(idx) || !runs[idx]) {
          setTrailSyncStatusText('Trail sync status: local only.')
          return
        }
        const entry = getTrailEntry(runs[idx], idx)
        setTrailSyncStatusText('Trail sync status: ' + trailSyncStateLabel(entry && entry.sync_state) + '.')
      })

      function setSmashrunStatus(text, ok) {
        const el = document.getElementById('smashrunStatus')
        if (!el) return
        el.textContent = text
        el.classList.toggle('ok', !!ok)
        el.classList.toggle('bad', !ok)
      }

      async function apiJson(url, options) {
        const res = await fetch(url, options)
        let data = {}
        try {
          data = await res.json()
        } catch (_) {
          data = {}
        }
        if (!res.ok || data.error) {
          const code = data.error || 'request_failed'
          const authUrls = ['/api/runs', '/api/stats', '/api/userinfo', '/api/goals', '/api/smashrun/']
          const isAuthish =
            typeof url === 'string' &&
            authUrls.some((p) => url.startsWith(p) || url.indexOf('/api/runs/') !== -1 || url.indexOf('/notes') !== -1)
          if (
            isAuthish &&
            (code === 'token_expired' || code === 'not_connected' || res.status === 401)
          ) {
            showReconnectBanner(code === 'token_expired')
          }
          const err = new Error(data.detail || data.error || 'request_failed')
          err.code = code
          throw err
        }
        return data
      }

      function showReconnectBanner(expired) {
        const bar = document.getElementById('reconnectBanner')
        const txt = document.getElementById('reconnectBannerText')
        if (!bar || !txt) return
        txt.textContent = expired
          ? 'Smashrun session expired. Reconnect to save and sync runs.'
          : 'Connect Smashrun in Settings (or tap Reconnect) to load and sync runs.'
        bar.hidden = false
      }

      function hideReconnectBanner() {
        const bar = document.getElementById('reconnectBanner')
        if (bar) bar.hidden = true
      }

      function showToast(message, variant) {
        const stack = document.getElementById('toastStack')
        if (!stack || !message) return
        const el = document.createElement('div')
        el.className = 'toast' + (variant === 'warn' ? ' warn' : variant === 'ok' ? ' ok' : '')
        el.textContent = message
        stack.appendChild(el)
        window.setTimeout(() => {
          el.style.opacity = '0'
          el.style.transition = 'opacity 0.25s ease'
          window.setTimeout(() => el.remove(), 280)
        }, 4200)
      }

      function explainApiError(code, message) {
        if (code === 'not_connected') {
          return 'Smashrun is not connected. Save is local now; connect in Settings to sync to cloud.'
        }
        if (code === 'token_expired') {
          return 'Your Smashrun session expired. Reconnect in Settings, then retry.'
        }
        if (code === 'invalid_date') {
          return 'Date format is invalid. Use YYYY-MM-DD and try again.'
        }
        if (code === 'invalid_input') {
          return 'Distance/time is invalid. Check numbers and try again.'
        }
        return message || 'Request failed. Please retry.'
      }

      function runDateIso(run) {
        const raw =
          (run && (run.date || run.startDateTimeLocal || run.startDateTimeUTC || run.startDateTime)) || ''
        const txt = String(raw).trim()
        if (!txt) return ''
        if (/^\d{4}-\d{2}-\d{2}$/.test(txt)) return txt
        const ymd = txt.match(/^(\d{4}-\d{2}-\d{2})/)
        if (ymd) return ymd[1]
        const d = new Date(txt)
        if (!Number.isFinite(d.getTime())) return ''
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return y + '-' + m + '-' + day
      }

      function autoTagsFromNote(note) {
        const text = String(note || '').toLowerCase()
        const tags = []
        if (/hill|incline|climb/.test(text)) tags.push('hills')
        if (/rain|wind|hot|cold|humid/.test(text)) tags.push('weather')
        if (/tired|fatigue|heavy/.test(text)) tags.push('fatigue')
        if (/easy|recovery/.test(text)) tags.push('easy')
        if (/tempo|interval|speed/.test(text)) tags.push('quality')
        return tags
      }

      function parseRunDateMs(run) {
        const iso = runDateIso(run)
        if (!iso) return null
        const parts = iso.split('-')
        const y = Number(parts[0])
        const m = Number(parts[1])
        const d = Number(parts[2])
        if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
        const t = new Date(y, m - 1, d, 12, 0, 0, 0).getTime()
        return Number.isFinite(t) ? t : null
      }

      function runInLast7Days(run) {
        const t = parseRunDateMs(run)
        if (t === null) return false
        const now = new Date()
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        start.setDate(start.getDate() - 6)
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        return t >= start.getTime() && t < end.getTime()
      }

      function getSortedFilteredIndices() {
        let idxs = runs.map((_, i) => i)
        if (runsFilter === 'week') {
          idxs = idxs.filter((i) => runInLast7Days(runs[i]))
        }
        const sort = runsSort || 'date-desc'
        idxs.sort((ia, ib) => {
          const a = runs[ia]
          const b = runs[ib]
          const da = parseRunDateMs(a) || 0
          const db = parseRunDateMs(b) || 0
          const distA = Number(a.distance) || 0
          const distB = Number(b.distance) || 0
          const timeA = Number(a.time) || 0
          const timeB = Number(b.time) || 0
          switch (sort) {
            case 'date-asc':
              return da - db || ia - ib
            case 'dist-desc':
              return distB - distA || db - da
            case 'time-desc':
              return timeB - timeA || db - da
            case 'date-desc':
            default:
              return db - da || ib - ia
          }
        })
        return idxs
      }

      function updateConnPill(text, ok) {
        const el = document.getElementById('connPill')
        if (!el) return
        el.textContent = text
        el.classList.toggle('ok', !!ok)
        el.classList.toggle('bad', !ok)
      }

      function updateSyncHintIncremental(wasIncremental) {
        const el = document.getElementById('syncHintText')
        if (!el) return
        el.textContent = wasIncremental
          ? 'Last sync used incremental updates (only activities changed since your saved watermark). Tap Sync runs for a fresh pull from Smashrun.'
          : 'First sync (or full reset) loads your recent Smashrun activities. Later syncs prefer incremental updates when timestamps are available.'
      }

      function formatLastSynced(ms) {
        if (ms == null || !Number.isFinite(ms)) return '—'
        try {
          const d = new Date(ms)
          return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
        } catch (_) {
          return '—'
        }
      }

      function updateLastSyncedUi(ms) {
        lastRunsSyncAt = ms
        try {
          if (ms != null && Number.isFinite(ms)) sessionStorage.setItem(LAST_SYNC_STORAGE_KEY, String(ms))
        } catch (_) {}
        const el = document.getElementById('runsLastSyncedLine')
        if (el) el.textContent = 'Last synced: ' + formatLastSynced(ms)
        renderTodayHub()
      }

      function clearLastSyncedUi() {
        lastRunsSyncAt = null
        try {
          sessionStorage.removeItem(LAST_SYNC_STORAGE_KEY)
        } catch (_) {}
        const el = document.getElementById('runsLastSyncedLine')
        if (el) el.textContent = 'Last synced: —'
        renderTodayHub()
      }

      function loadLastSyncedFromStorage() {
        try {
          const raw = sessionStorage.getItem(LAST_SYNC_STORAGE_KEY)
          const ms = raw ? parseInt(raw, 10) : NaN
          if (Number.isFinite(ms)) {
            lastRunsSyncAt = ms
            const el = document.getElementById('runsLastSyncedLine')
            if (el) el.textContent = 'Last synced: ' + formatLastSynced(ms)
          }
        } catch (_) {}
      }

      function clearRunsBackgroundSync() {
        if (runsBgSyncTimerId !== null) {
          clearInterval(runsBgSyncTimerId)
          runsBgSyncTimerId = null
        }
      }

      function maybeBackgroundSyncRuns() {
        if (!smashrunConnected || document.hidden) return
        const now = Date.now()
        if (lastRunsSyncAt != null && now - lastRunsSyncAt < RUNS_BG_SYNC_MIN_GAP_MS) return
        syncRunsFromBackend(false)
      }

      function startRunsBackgroundSync() {
        clearRunsBackgroundSync()
        if (!smashrunConnected) return
        runsBgSyncTimerId = window.setInterval(function () {
          maybeBackgroundSyncRuns()
        }, RUNS_BG_SYNC_INTERVAL_MS)
      }

      function updateDistanceLabels() {
        const label = document.getElementById('labelDist')
        if (!label) return
        label.textContent = preferredMiles() ? 'Distance (miles)' : 'Distance (kilometers)'
        const dist = document.getElementById('dist')
        if (dist) dist.setAttribute('step', 'any')
      }

      function distanceInputToMiles(raw) {
        const v = parseFloat(String(raw || '').trim())
        if (!Number.isFinite(v)) return NaN
        return preferredMiles() ? v : v / 1.609344
      }

      function formatPaceForRun(distanceMi, timeMin) {
        const d = Number(distanceMi)
        const t = Number(timeMin)
        if (!Number.isFinite(d) || d <= 0 || !Number.isFinite(t) || t < 0) return ''
        if (preferredMiles()) {
          const mpm = t / d
          const c = formatPaceClock(mpm)
          return c ? c + ' /mi' : ''
        }
        const km = d * 1.609344
        const mpk = t / km
        const totalSec = Math.round(mpk * 60)
        const mm = Math.floor(totalSec / 60)
        const ss = totalSec % 60
        const c = mm + ':' + String(ss).padStart(2, '0')
        return c + ' /km'
      }

      function clearFieldErrors() {
        ;['distError', 'timeError', 'dateError'].forEach((id) => {
          const e = document.getElementById(id)
          if (e) e.textContent = ''
        })
      }

      function validateAddForm() {
        clearFieldErrors()
        const dRaw = document.getElementById('dist').value.trim()
        const tRaw = document.getElementById('time').value.trim()
        const dateStr = document.getElementById('runDate').value.trim()
        const dMi = distanceInputToMiles(dRaw)
        const t = parseFloat(tRaw)
        let ok = true
        if (!dRaw || Number.isNaN(dMi)) {
          const e = document.getElementById('distError')
          if (e) e.textContent = 'Enter a distance.'
          ok = false
        } else if (dMi <= 0) {
          const e = document.getElementById('distError')
          if (e) e.textContent = 'Distance must be greater than zero.'
          ok = false
        }
        if (!tRaw || Number.isNaN(t)) {
          const e = document.getElementById('timeError')
          if (e) e.textContent = 'Enter time in minutes.'
          ok = false
        } else if (t < 0) {
          const e = document.getElementById('timeError')
          if (e) e.textContent = 'Time cannot be negative.'
          ok = false
        }
        if (!dateStr) {
          const e = document.getElementById('dateError')
          if (e) e.textContent = 'Pick a date.'
          ok = false
        }
        return ok
      }

      function setRunDetailTab(name) {
        const tabs = ['notes', 'splits', 'tags', 'notables']
        const map = {
          notes: { btn: 'detailTabNotes', panel: 'detailPanelNotes' },
          splits: { btn: 'detailTabSplits', panel: 'detailPanelSplits' },
          tags: { btn: 'detailTabTags', panel: 'detailPanelTags' },
          notables: { btn: 'detailTabNotables', panel: 'detailPanelNotables' },
        }
        tabs.forEach((t) => {
          const b = document.getElementById(map[t].btn)
          const p = document.getElementById(map[t].panel)
          const active = t === name
          if (b) {
            b.classList.toggle('is-active', active)
            b.setAttribute('aria-selected', active ? 'true' : 'false')
          }
          if (p) p.hidden = !active
        })
      }

      function kmFromMiles(mi) {
        const v = Number(mi)
        return Number.isFinite(v) ? v * 1.609344 : 0
      }

      function runsInLastDays(days) {
        const now = new Date()
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        start.setDate(start.getDate() - Math.max(0, Number(days) - 1))
        const startMs = start.getTime()
        return runs.filter((run) => {
          const t = parseRunDateMs(run)
          return t !== null && t >= startMs
        })
      }

      function computeLoadKm(days) {
        return runsInLastDays(days).reduce((sum, run) => sum + kmFromMiles(run.distance), 0)
      }

      function recommendWorkout() {
        if (!runs.length) {
          return 'Start with an easy 20–30 minute run. Focus on comfort and consistency.'
        }
        const sorted = runs
          .slice()
          .sort((a, b) => (parseRunDateMs(b) || 0) - (parseRunDateMs(a) || 0))
        const last = sorted[0]
        const lastPace = Number(last && last.distance) > 0 ? Number(last.time) / Number(last.distance) : NaN
        const load7 = computeLoadKm(7)
        const load28 = computeLoadKm(28)
        const baseline = load28 > 0 ? load28 / 4 : load7
        if (baseline > 0 && load7 > baseline * 1.35) {
          return 'Recovery day: 25–35 min easy (Zone 1–2) or rest. Your 7-day load is elevated.'
        }
        if (Number.isFinite(lastPace) && lastPace <= 8.2) {
          return 'Quality day: 10 min easy + 4 × 3 min comfortably hard + 2 min easy recoveries.'
        }
        if (Number.isFinite(lastPace) && lastPace >= 11.5) {
          return 'Build aerobic base: 30–40 min easy, keep breathing conversational.'
        }
        return 'Steady day: 35–45 min easy with 4 short strides near the end.'
      }

      function coachReadinessScore() {
        const energy = Number(featureState.coachMoodEnergy) || 3
        const stress = Number(featureState.coachMoodStress) || 3
        const soreness = Number(featureState.coachMoodSoreness) || 3
        const sleep = Number(featureState.coachMoodSleep) || 3
        const moodBase = 50 + (energy - 3) * 12 - (stress - 3) * 10 - (soreness - 3) * 10 + (sleep - 3) * 10
        const load7 = computeLoadKm(7)
        const load28 = computeLoadKm(28)
        const baseline = load28 > 0 ? load28 / 4 : load7
        let loadPenalty = 0
        if (baseline > 0 && load7 > baseline * 1.35) loadPenalty = 12
        if (baseline > 0 && load7 > baseline * 1.6) loadPenalty = 20
        const score = Math.max(0, Math.min(100, Math.round(moodBase - loadPenalty)))
        return score
      }

      function moodWorkoutRecommendation() {
        const score = coachReadinessScore()
        if (score >= 72) {
          return 'Quality day: 10 min easy + 5 x 3 min strong, 2 min easy recoveries.'
        }
        if (score >= 50) {
          return 'Steady aerobic day: 35–45 min easy with 4 short relaxed strides.'
        }
        if (score >= 35) {
          return 'Low-stress day: 25–35 min very easy or brisk walk + light mobility.'
        }
        return 'Recovery first: rest or 20 min walk. Focus on sleep/hydration and return tomorrow.'
      }

      function moodReadinessLine(score) {
        if (score >= 72) return 'Readiness: ' + score + '/100 · ready to push.'
        if (score >= 50) return 'Readiness: ' + score + '/100 · good for steady training.'
        if (score >= 35) return 'Readiness: ' + score + '/100 · keep intensity low today.'
        return 'Readiness: ' + score + '/100 · prioritize recovery.'
      }

      function forecastGoalLine() {
        const el = document.getElementById('coachForecastText')
        if (!el) return
        if (!Number.isFinite(monthlyGoalKm) || monthlyGoalKm <= 0 || !Number.isFinite(monthlyDoneKm)) {
          el.textContent = 'Goal forecast: set a monthly Smashrun goal to see on-track ETA.'
          return
        }
        const now = new Date()
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        const day = now.getDate()
        const remainingKm = Math.max(0, monthlyGoalKm - monthlyDoneKm)
        if (remainingKm <= 0) {
          el.textContent = 'Goal forecast: goal complete. Great work — stretch goal unlocked.'
          return
        }
        const safeDay = Math.max(1, day)
        const avgDaily = monthlyDoneKm / safeDay
        const projectedDays = avgDaily > 0 ? Math.ceil(remainingKm / avgDaily) : null
        if (projectedDays === null) {
          el.textContent = 'Goal forecast: no progress yet this month — add your first run to start ETA.'
          return
        }
        const etaDay = day + projectedDays
        if (etaDay <= daysInMonth) {
          el.textContent =
            'Goal forecast: on track — current pace projects completion around day ' +
            etaDay +
            ' of ' +
            daysInMonth +
            '.'
        } else {
          const behind = etaDay - daysInMonth
          el.textContent =
            'Goal forecast: behind pace by ~' +
            behind +
            ' day' +
            (behind === 1 ? '' : 's') +
            '. Add about ' +
            formatKmForUser(remainingKm / Math.max(1, daysInMonth - day + 1)) +
            '/day to close the gap.'
        }
      }

      function trendRowsForMetric(metric) {
        const sorted = runs
          .slice()
          .filter((run) => parseRunDateMs(run) !== null)
          .sort((a, b) => (parseRunDateMs(a) || 0) - (parseRunDateMs(b) || 0))
          .slice(-14)
        return sorted.map((run) => {
          const d = Number(run.distance)
          const t = Number(run.time)
          const paceVal = d > 0 ? t / d : NaN
          const v = metric === 'pace' ? paceVal : kmFromMiles(d)
          return {
            date: runDateIso(run),
            value: Number.isFinite(v) ? v : 0,
            label:
              metric === 'pace'
                ? (Number.isFinite(v) ? v.toFixed(2) : '—') + ' min/mi'
                : formatKmForUser(v),
          }
        })
      }

      function renderTrendChart() {
        const metricEl = document.getElementById('coachTrendMetric')
        const svg = document.getElementById('coachTrendSvg')
        const cursor = document.getElementById('coachTrendCursor')
        const detail = document.getElementById('coachTrendDetail')
        const badge = document.getElementById('coachTrendBadge')
        if (!metricEl || !svg || !cursor || !detail || !badge) return
        const metric = metricEl.value === 'pace' ? 'pace' : 'distance'
        coachTrendRows = trendRowsForMetric(metric)
        badge.textContent = 'Last ' + coachTrendRows.length + ' runs'
        if (!coachTrendRows.length) {
          svg.innerHTML = ''
          cursor.min = '1'
          cursor.max = '1'
          cursor.value = '1'
          detail.textContent = 'Add runs to see trend history.'
          return
        }

        const vals = coachTrendRows.map((r) => r.value)
        const minV = Math.min(...vals)
        const maxV = Math.max(...vals)
        const span = Math.max(0.0001, maxV - minV)
        const left = 14
        const right = 306
        const top = 8
        const bottom = 98
        const points = coachTrendRows.map((row, idx) => {
          const x = left + (coachTrendRows.length === 1 ? 0 : (idx / (coachTrendRows.length - 1)) * (right - left))
          const y = bottom - ((row.value - minV) / span) * (bottom - top)
          return { x, y }
        })
        const line = points.map((p) => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ')
        svg.innerHTML =
          '<polyline points="' +
          line +
          '" fill="none" stroke="#0ea5e9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></polyline>'

        const activeIdx = Math.max(0, Math.min(coachTrendRows.length - 1, Number(cursor.value) - 1 || coachTrendRows.length - 1))
        points.forEach((p, i) => {
          const color = i === activeIdx ? '#22c55e' : '#0ea5e9'
          const radius = i === activeIdx ? 4.2 : 2.3
          const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
          c.setAttribute('cx', String(p.x))
          c.setAttribute('cy', String(p.y))
          c.setAttribute('r', String(radius))
          c.setAttribute('fill', color)
          c.style.cursor = 'pointer'
          c.addEventListener('click', () => {
            cursor.value = String(i + 1)
            renderTrendChart()
          })
          svg.appendChild(c)
        })
        cursor.min = '1'
        cursor.max = String(coachTrendRows.length)
        if (!cursor.value || Number(cursor.value) > coachTrendRows.length) cursor.value = String(coachTrendRows.length)
        const idx = Math.max(0, Math.min(coachTrendRows.length - 1, Number(cursor.value) - 1))
        const row = coachTrendRows[idx]
        detail.textContent = row.date + ' · ' + row.label
      }

      function renderDynamicCoach() {
        const rec = document.getElementById('coachRecommendationText')
        const ready = coachReadinessScore()
        const moodRec = moodWorkoutRecommendation()
        const baseRec = recommendWorkout()
        if (rec) rec.textContent = 'Next workout: ' + moodRec + ' Baseline trend: ' + baseRec
        const readEl = document.getElementById('coachReadinessText')
        if (readEl) readEl.textContent = moodReadinessLine(ready)
        const e = document.getElementById('coachMoodEnergy')
        const s = document.getElementById('coachMoodStress')
        const so = document.getElementById('coachMoodSoreness')
        const sl = document.getElementById('coachMoodSleep')
        if (e) e.value = String(featureState.coachMoodEnergy || 3)
        if (s) s.value = String(featureState.coachMoodStress || 3)
        if (so) so.value = String(featureState.coachMoodSoreness || 3)
        if (sl) sl.value = String(featureState.coachMoodSleep || 3)
        forecastGoalLine()
        renderTrendChart()
        renderTodayHub()
      }

      function renderTodayHub() {
        const readyEl = document.getElementById('todayHubReadiness')
        const workoutEl = document.getElementById('todayHubWorkout')
        const weatherEl = document.getElementById('todayHubWeather')
        const rescueEl = document.getElementById('todayHubRescue')
        const syncEl = document.getElementById('todayHubSync')
        const score = coachReadinessScore()
        const workout = moodWorkoutRecommendation()
        if (readyEl) readyEl.textContent = moodReadinessLine(score)
        if (workoutEl) workoutEl.textContent = 'Workout: ' + workout
        const weatherNow = document.getElementById('weatherText')
        if (weatherEl) {
          const w = String((weatherNow && weatherNow.textContent) || '').trim()
          weatherEl.textContent = w ? 'Weather window: ' + w : 'Weather window: tap weather above for a local forecast.'
        }
        const streak = computeRunStreak()
        const hasToday = runs.some((r) => runDateIso(r) === todayISO())
        if (rescueEl) {
          rescueEl.textContent = hasToday
            ? 'Streak rescue: complete — nice consistency today.'
            : streak > 0
              ? 'Streak rescue: do 15 easy minutes today to keep your ' + streak + '-day streak alive.'
              : 'Streak rescue: start with one easy run today to kick off momentum.'
        }
        if (syncEl) {
          const pendingLocal = localOnlyRuns(runs).length
          let line =
            pendingLocal > 0
              ? 'Sync: ' + pendingLocal + ' local run(s) pending cloud sync.'
              : smashrunConnected
                ? 'Sync: connected — list auto-refreshes every few minutes while this tab is open.'
                : 'Sync: local mode (connect Smashrun for cloud backup).'
          if (smashrunConnected && lastRunsSyncAt != null && Number.isFinite(lastRunsSyncAt)) {
            line += ' Last check: ' + formatLastSynced(lastRunsSyncAt) + '.'
          }
          syncEl.textContent = line
        }
      }

      function computeWeeklySummary() {
        let sumMi = 0
        let n = 0
        runs.forEach((run) => {
          if (runInLast7Days(run)) {
            sumMi += Number(run.distance) || 0
            n += 1
          }
        })
        const km = sumMi * 1.609344
        return { sumMi, sumKm: km, n }
      }

      function updateWeeklyDashTile() {
        const w = computeWeeklySummary()
        const distEl = document.getElementById('dashWeekDist')
        const runEl = document.getElementById('dashWeekRuns')
        if (distEl) distEl.textContent = formatKmForUser(w.sumKm)
        if (runEl) runEl.textContent = 'From synced list · Runs: ' + (w.n ? String(w.n) : '0')
      }

      function maybeCelebrateMilestone(totalKm) {
        if (!Number.isFinite(totalKm) || totalKm <= 0) return
        const floor = Math.floor(totalKm / 50) * 50
        if (floor >= 50 && floor > milestoneKmFloor) {
          milestoneKmFloor = floor
          try {
            sessionStorage.setItem(MILESTONE_KEY, String(floor))
          } catch (_) {}
          const banner = document.getElementById('milestoneBanner')
          if (banner) {
            banner.textContent =
              '🎉 You crossed ' + formatKmForUser(floor) + ' total distance (Smashrun all-time stats). Keep going!'
            banner.hidden = false
          }
          showToast('Milestone: about ' + formatKmForUser(floor) + ' total distance.', 'ok')
        }
      }

      function readOnboardingDismissed() {
        try {
          return localStorage.getItem(ONBOARD_KEY) === '1'
        } catch (_) {
          return false
        }
      }

      function updateOnboardingSteps() {
        const card = document.getElementById('onboardingCard')
        if (!card) return
        if (readOnboardingDismissed()) {
          card.hidden = true
          return
        }
        card.hidden = false
        const stepConnect = document.getElementById('stepConnect')
        const stepAdd = document.getElementById('stepAdd')
        const stepRuns = document.getElementById('stepRuns')
        if (stepConnect) stepConnect.classList.toggle('done', !!smashrunConnected)
        if (stepAdd) stepAdd.classList.toggle('done', runs.length > 0)
        if (stepRuns) stepRuns.classList.toggle('done', runs.length > 0)
      }

      function updateFilterChips() {
        const a = document.getElementById('filterChipAll')
        const w = document.getElementById('filterChipWeek')
        if (a) a.setAttribute('aria-pressed', runsFilter === 'all' ? 'true' : 'false')
        if (w) w.setAttribute('aria-pressed', runsFilter === 'week' ? 'true' : 'false')
      }

      async function refreshSmashrunStatus() {
        try {
          const data = await apiJson('/api/smashrun/status')
          const dash = document.getElementById('smashrunDash')
          if (dash) dash.hidden = !data.connected
          if (data.connected) {
            smashrunConnected = true
            hideReconnectBanner()
            const who = data.user && data.user.username ? ' as @' + data.user.username : ''
            setSmashrunStatus('Connected to Smashrun' + who + '.', true)
            updateConnPill('Smashrun: connected' + who, true)
            refreshDashboard().catch(() => {})
            startRunsBackgroundSync()
          } else {
            smashrunConnected = false
            userProfile = null
            clearRunsBackgroundSync()
            if (dash) dash.hidden = true
            setSmashrunStatus('Not connected. Runs still save on this computer.', false)
            updateConnPill('Smashrun: not connected', false)
          }
          updateOnboardingSteps()
        } catch (err) {
          smashrunConnected = false
          clearRunsBackgroundSync()
          if (err && (err.code === 'not_connected' || err.code === 'token_expired')) {
            setSmashrunStatus('Not connected. Runs still save on this computer.', false)
            updateConnPill('Smashrun: not connected', false)
          } else {
            setSmashrunStatus('Smashrun status unavailable: ' + (err.message || 'request failed'), false)
            updateConnPill('Smashrun: status error', false)
          }
        }
      }

      async function refreshDashboard() {
        const hint = document.getElementById('dashHint')
        try {
          userProfile = await apiJson('/api/userinfo')
        } catch (_) {
          userProfile = null
        }

        const y = new Date().getFullYear()
        const m = new Date().getMonth() + 1

        try {
          const all = await apiJson('/api/stats')
          const ys = await apiJson('/api/stats?year=' + encodeURIComponent(String(y)))
          const ms = await apiJson('/api/stats?year=' + encodeURIComponent(String(y)) + '&month=' + encodeURIComponent(String(m)))

          document.getElementById('dashAllDist').textContent = formatKmForUser(Number(all.totalDistance))
          document.getElementById('dashAllRuns').textContent = 'Runs: ' + (Number.isFinite(Number(all.runCount)) ? String(all.runCount) : '—')

          document.getElementById('dashYearDist').textContent = formatKmForUser(Number(ys.totalDistance))
          document.getElementById('dashYearPace').textContent =
            ys.averagePace ? 'Avg pace: ' + String(ys.averagePace) : 'Avg pace: —'

          document.getElementById('dashMonthDist').textContent = formatKmForUser(Number(ms.totalDistance))
          document.getElementById('dashMonthRuns').textContent = 'Runs: ' + (Number.isFinite(Number(ms.runCount)) ? String(ms.runCount) : '—')

          maybeCelebrateMilestone(Number(all.totalDistance))
        } catch (_) {
          document.getElementById('dashAllDist').textContent = '—'
          document.getElementById('dashYearDist').textContent = '—'
          document.getElementById('dashMonthDist').textContent = '—'
        }

        updateWeeklyDashTile()
        updateDistanceLabels()

        try {
          const goals = await apiJson('/api/goals?year=' + encodeURIComponent(String(y)) + '&month=' + encodeURIComponent(String(m)))
          const g = goals && typeof goals === 'object' && 'goal' in goals ? goals.goal : goals
          const goalKm = Number(g && g.goalKilometers)
          const doneKm = Number(g && g.kilometers)
          const txt = g && g.goalText ? String(g.goalText) : ''
          monthlyGoalKm = Number.isFinite(goalKm) ? goalKm : null
          monthlyDoneKm = Number.isFinite(doneKm) ? doneKm : null
          monthlyGoalText = txt || ''
          if (g === null || g === undefined || (!Number.isFinite(goalKm) && !txt)) {
            document.getElementById('dashGoalProgress').textContent = '—'
            document.getElementById('dashGoalText').textContent = 'No monthly goal set in Smashrun.'
          } else if (Number.isFinite(goalKm)) {
            const pct = Number.isFinite(doneKm) && goalKm > 0 ? Math.min(100, Math.round((doneKm / goalKm) * 100)) : null
            document.getElementById('dashGoalProgress').textContent =
              pct === null ? formatKmForUser(doneKm) + ' / ' + formatKmForUser(goalKm) : pct + '%'
            document.getElementById('dashGoalText').textContent = (txt ? txt + ' · ' : '') + formatKmForUser(doneKm) + ' of ' + formatKmForUser(goalKm)
          } else {
            document.getElementById('dashGoalProgress').textContent = '—'
            document.getElementById('dashGoalText').textContent = txt || '—'
          }
        } catch (_) {
          monthlyGoalKm = null
          monthlyDoneKm = null
          monthlyGoalText = ''
          document.getElementById('dashGoalProgress').textContent = '—'
          document.getElementById('dashGoalText').textContent = 'Goals unavailable.'
        }

        const lastTs = userProfile && userProfile.dateTimeUTCOfLastRun
        document.getElementById('dashLastRun').textContent =
          typeof lastTs === 'number' && Number.isFinite(lastTs) ? formatUtcClock(lastTs) : '—'

        const units =
          userProfile && userProfile.unitDistance === 'k'
            ? 'Metric (km)'
            : userProfile && userProfile.unitDistance === 'm'
              ? 'Imperial (mi)'
              : '—'
        document.getElementById('dashUnits').textContent = 'Units: ' + units

        if (hint) {
          hint.textContent =
            'Stats and goals reflect your Smashrun account. Run list sync uses incremental updates when possible.'
        }
        renderDynamicCoach()
      }

      async function syncRunsFromBackend(logResult = true) {
        runsLoading = true
        renderRunsList()
        let didSyncOk = false
        try {
          const pendingLocal = localOnlyRuns(runs.slice())
          const sync = readSyncState()
          // Only use incremental mode when we already have a local baseline list.
          // After a reload, `runs` starts empty; incremental-only fetch can return 0 updates
          // and leave the UI empty even though account runs exist.
          const incremental = sync.lastWatermark > 0 && runs.length > 0
          let url = '/api/runs?count=100'
          if (incremental) {
            url += '&fromDateUTC=' + encodeURIComponent(String(Math.max(0, sync.lastWatermark - 1)))
          }
          const data = await apiJson(url)
          const incoming = data.runs || []
          if (incremental && incoming.length) {
            const merged = mergeRunsById(runs.slice(), incoming)
            runs.length = 0
            merged.forEach((r) => runs.push(r))
          } else if (incremental) {
            // Incremental sync with no updates should keep current list intact.
            // Clearing here makes "All" and "Last 7 days" appear empty.
          } else {
            runs.length = 0
            incoming.forEach((run) => runs.push(run))
          }
          // Keep locally saved unsynced runs visible when Smashrun is not connected yet.
          if (pendingLocal.length) {
            pendingLocal.forEach((run) => runs.push(run))
          }

          const wmLocal = maxWatermarkFromRuns(runs)
          const bump = incoming.some((r) => r && (r._modifiedUtc === undefined || r._modifiedUtc === null))
          const fallbackNow = bump ? Math.floor(Date.now() / 1000) : 0
          const nextWatermark = Math.max(sync.lastWatermark, wmLocal, fallbackNow)
          writeSyncState({ lastWatermark: nextWatermark })

          updateSyncHintIncremental(incremental && incoming.length > 0)
          updateBadge()
          updateWeeklyDashTile()
          updateOnboardingSteps()
          didSyncOk = true
          if (logResult) {
            const where = data.smashrun_synced ? 'Smashrun and this computer' : 'this computer'
            log('Loaded ' + runs.length + ' run(s) from ' + where + (incremental ? ' (incremental)' : '') + '.')
            showToast('Runs loaded (' + runs.length + ' saved).', 'ok')
          }
          renderDynamicCoach()
        } catch (err) {
          if (err.code === 'not_connected') {
            updateBadge()
            renderRunsList()
            renderDynamicCoach()
            if (logResult) log('Showing runs saved on this computer. Connect Smashrun in Settings to sync.')
          } else if (logResult) {
            log('Run sync failed: ' + (err.message || 'request failed'))
            showToast('Sync failed: ' + (err.message || 'error'), 'warn')
          }
        } finally {
          runsLoading = false
          if (didSyncOk) updateLastSyncedUi(Date.now())
          renderRunsList()
          renderDynamicCoach()
        }
      }

      function closeRunDetailModal() {
        document.getElementById('runDetailModal').hidden = true
        runDetailIndex = null
        if (detailModalFocusBefore && typeof detailModalFocusBefore.focus === 'function') {
          try {
            detailModalFocusBefore.focus()
          } catch (_) {}
        }
        detailModalFocusBefore = null
      }

      function setRunDetailStatus(text) {
        const el = document.getElementById('runDetailNotesStatus')
        if (el) el.textContent = text || ''
      }

      function renderTags(tagsPayload) {
        const wrap = document.getElementById('runDetailTags')
        wrap.innerHTML = ''
        let tags = tagsPayload
        if (tagsPayload && typeof tagsPayload === 'object' && Array.isArray(tagsPayload.tags)) {
          tags = tagsPayload.tags
        }
        if (!Array.isArray(tags) || tags.length === 0) {
          const p = document.createElement('span')
          p.className = 'dash-tile-sub'
          p.style.margin = '0'
          p.textContent = 'No tags.'
          wrap.appendChild(p)
          return
        }
        tags.forEach((t) => {
          const chip = document.createElement('span')
          chip.className = 'tag-chip'
          chip.textContent = String(t)
          wrap.appendChild(chip)
        })
      }

      function renderNotables(rows) {
        const ul = document.getElementById('runDetailNotables')
        ul.innerHTML = ''
        if (!Array.isArray(rows) || rows.length === 0) {
          const li = document.createElement('li')
          li.textContent = 'No notables returned for this run.'
          ul.appendChild(li)
          return
        }
        rows.forEach((row) => {
          const li = document.createElement('li')
          const desc =
            row && typeof row === 'object'
              ? row.description || row.text || row.summary || JSON.stringify(row)
              : String(row)
          li.textContent = String(desc)
          ul.appendChild(li)
        })
      }

      function renderSplitsTable(unitKey, payload) {
        const wrap = document.getElementById('runDetailSplitsWrap')
        wrap.innerHTML = ''
        let rows = payload
        if (payload && typeof payload === 'object' && Array.isArray(payload.splits)) {
          rows = payload.splits
        }
        if (!Array.isArray(rows)) {
          const p = document.createElement('p')
          p.className = 'dash-tile-sub'
          p.style.margin = '0'
          p.textContent = 'Splits unavailable.'
          wrap.appendChild(p)
          return
        }
        const table = document.createElement('table')
        table.className = 'split-table'
        const thead = document.createElement('thead')
        thead.innerHTML =
          '<tr><th>#</th><th>Distance (' +
          (unitKey === 'mi' ? 'mi' : 'km') +
          ')</th><th>Pace</th><th>HR</th></tr>'
        const tbody = document.createElement('tbody')
        rows.forEach((row, idx) => {
          if (!row || typeof row !== 'object') return
          const tr = document.createElement('tr')
          const splitIndex = row.index !== undefined ? row.index : idx + 1
          const dist =
            unitKey === 'mi'
              ? row.distanceMiles !== undefined
                ? row.distanceMiles
                : row.distance
              : row.distanceKilometers !== undefined
                ? row.distanceKilometers
                : row.distance
          const pace = row.pace || row.averagePace || row.paceText || ''
          const hr = row.heartRate !== undefined ? row.heartRate : row.averageHeartRate
          tr.innerHTML =
            '<td>' +
            String(splitIndex) +
            '</td><td>' +
            (dist !== undefined && dist !== null ? String(dist) : '—') +
            '</td><td>' +
            String(pace || '—') +
            '</td><td>' +
            (hr !== undefined && hr !== null ? String(hr) : '—') +
            '</td>'
          tbody.appendChild(tr)
        })
        table.appendChild(thead)
        table.appendChild(tbody)
        wrap.appendChild(table)
      }

      async function loadRunDetailExtras(activityId, unit) {
        const tagsP = apiJson('/api/runs/' + encodeURIComponent(activityId) + '/tags').catch(() => null)
        const notP = apiJson('/api/runs/' + encodeURIComponent(activityId) + '/notables').catch(() => null)
        const splitP = apiJson('/api/runs/' + encodeURIComponent(activityId) + '/splits/' + encodeURIComponent(unit)).catch(() => null)
        const [tags, notables, splits] = await Promise.all([tagsP, notP, splitP])
        renderTags(tags)
        renderNotables(Array.isArray(notables) ? notables : notables && notables.notables ? notables.notables : notables)
        renderSplitsTable(unit, splits)
      }

      async function openRunDetail(index) {
        const run = runs[index]
        if (!run || run.id === undefined || run.id === null) {
          log('Run details need a Smashrun id — sync runs after connecting.')
          showToast('Connect Smashrun and sync runs to open details.', 'warn')
          return
        }
        setRunDetailTab('notes')
        detailModalFocusBefore = document.activeElement
        runDetailIndex = index
        document.getElementById('runDetailTitle').textContent = 'Run ' + (index + 1)
        document.getElementById('runDetailSummary').textContent = runSummaryLine(run)
        document.getElementById('runDetailNotes').value = String(run.notes || '')
        setRunDetailStatus('')
        document.getElementById('runDetailModal').hidden = false
        document.getElementById('runDetailClose').focus()

        try {
          const detail = await apiJson('/api/runs/' + encodeURIComponent(run.id))
          const notes = detail.run && detail.run.notes !== undefined ? detail.run.notes : run.notes
          document.getElementById('runDetailNotes').value = String(notes || '')
          if (detail.smashrun && detail.smashrun.notes !== undefined) {
            document.getElementById('runDetailNotes').value = String(detail.smashrun.notes || '')
          }
        } catch (_) {
          // keep local list notes
        }

        const unit = preferredMiles() ? 'mi' : 'km'
        await loadRunDetailExtras(run.id, unit)
      }

      async function saveRunNotes() {
        if (runDetailIndex === null) return
        const run = runs[runDetailIndex]
        if (!run || run.id === undefined || run.id === null) return
        const notes = document.getElementById('runDetailNotes').value
        setRunDetailStatus('Saving…')
        try {
          const saved = await apiJson('/api/runs/' + encodeURIComponent(run.id) + '/notes', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes }),
          })
          run.notes = notes
          setRunDetailStatus('Saved.')
          renderRunsList()
          showToast(
            saved && saved.saved === 'smashrun' ? 'Notes saved and synced to Smashrun.' : 'Notes saved on this computer.',
            'ok'
          )
        } catch (err) {
          setRunDetailStatus('Save failed: ' + (err.message || 'request failed'))
        }
      }

      function refreshServiceKeyStatus() {
        const el = document.getElementById('serviceKeyStatus')
        fetch('/api/settings')
          .then((r) => r.json())
          .then((data) => {
            const ok = data.service_key_configured || data.openai_configured
            if (ok) {
              el.textContent = 'An API key is linked for this server session.'
              el.classList.remove('bad')
              el.classList.add('ok')
            } else {
              el.textContent =
                'No API key — paste one and tap Save, or set SERVICE_API_KEY (or OPENAI_API_KEY) in .env.'
              el.classList.remove('ok')
              el.classList.add('bad')
            }
          })
          .catch(() => {
            el.textContent = 'Could not reach /api/settings (is the Flask server running?)'
            el.classList.remove('ok')
            el.classList.add('bad')
          })
      }

      document.getElementById('saveServiceKey').addEventListener('click', () => {
        const key = document.getElementById('serviceKeyInput').value.trim()
        const el = document.getElementById('serviceKeyStatus')
        el.textContent = 'Saving…'
        document.querySelector('.settings-advanced').open = true
        fetch('/api/settings/service-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ service_api_key: key }),
        })
          .then((r) => r.json())
          .then((data) => {
            const configured = data.service_key_configured || data.openai_configured
            if (configured) {
              el.textContent = 'Saved. API key is active for this server process.'
              el.classList.remove('bad')
              el.classList.add('ok')
              document.getElementById('serviceKeyInput').value = ''
            } else {
              el.textContent = 'Key cleared.'
              el.classList.remove('ok')
              el.classList.add('bad')
            }
          })
          .catch(() => {
            el.textContent = 'Save failed — check that Flask is running.'
            el.classList.remove('ok')
            el.classList.add('bad')
          })
      })

      document.getElementById('clearServiceKey').addEventListener('click', () => {
        document.getElementById('serviceKeyInput').value = ''
        fetch('/api/settings/service-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ service_api_key: '' }),
        }).then(() => refreshServiceKeyStatus())
      })

      document.getElementById('smashrunConnectBtn').addEventListener('click', () => {
        window.location.href = '/api/smashrun/login'
      })

      document.getElementById('smashrunDisconnectBtn').addEventListener('click', async () => {
        try {
          await apiJson('/api/smashrun/logout', { method: 'POST' })
          smashrunConnected = false
          setSmashrunStatus('Disconnected from Smashrun.', false)
          userProfile = null
          writeSyncState({ lastWatermark: 0 })
          const dash = document.getElementById('smashrunDash')
          if (dash) dash.hidden = true
          updateConnPill('Smashrun: not connected', false)
          hideReconnectBanner()
          clearRunsBackgroundSync()
          clearLastSyncedUi()
          runs.length = 0
          updateBadge()
          renderRunsList()
          log('Smashrun disconnected.')
          showToast('Disconnected from Smashrun.', 'ok')
          updateOnboardingSteps()
        } catch (err) {
          setSmashrunStatus('Disconnect failed: ' + (err.message || 'request failed'), false)
        }
      })

      document.getElementById('smashrunRefreshBtn').addEventListener('click', () => {
        syncRunsFromBackend(true)
      })

      document.getElementById('dashRefreshBtn').addEventListener('click', async () => {
        try {
          await refreshDashboard()
          await syncRunsFromBackend(true)
          log('Dashboard and runs refreshed.')
        } catch (_) {
          log('Dashboard refresh failed.')
        }
      })

      function todayISO() {
        const d = new Date()
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return y + '-' + m + '-' + day
      }

      function runSummaryLine(run) {
        const datePrefix = run.date ? run.date + ' · ' : ''
        const du = preferredMiles()
          ? Number(run.distance || 0).toFixed(2) + ' mi'
          : (Number(run.distance || 0) * 1.609344).toFixed(2) + ' km'
        const paceBit = formatPaceForRun(Number(run.distance), Number(run.time))
        return datePrefix + du + ' · ' + run.time + ' min' + (paceBit ? ' · ' + paceBit : '')
      }

      function renderSearchResults() {
        const iso = document.getElementById('searchDate').value.trim()
        const pick = document.getElementById('searchEmptyPick')
        const noMatch = document.getElementById('searchNoMatch')
        const list = document.getElementById('searchRunsList')
        const hint = document.getElementById('searchHint')
        list.innerHTML = ''

        if (!iso) {
          pick.hidden = false
          noMatch.hidden = true
          list.hidden = true
          hint.textContent = 'Choose a date to see runs logged that day.'
          return
        }

        pick.hidden = true
        hint.textContent = 'Showing runs on ' + iso + '.'

        const indices = []
        runs.forEach((run, i) => {
          if ((run.date || '') !== iso) return
          if (runsFilter === 'week' && !runInLast7Days(run)) return
          indices.push(i)
        })

        if (indices.length === 0) {
          noMatch.hidden = false
          list.hidden = true
          return
        }

        noMatch.hidden = true
        list.hidden = false
        const trailStore = readTrailsStore()

        indices.forEach((i, pos) => {
          const run = runs[i]
          const hasTrail = hasSavedTrail(run, i, trailStore)
          const trailEntry = getTrailEntry(run, i, trailStore)
          const syncLabel = hasTrail ? trailSyncStateLabel(trailEntry && trailEntry.sync_state) : 'no trail'
          const row = document.createElement('div')
          row.className = 'run-row'
          row.setAttribute('role', 'listitem')
          row.innerHTML =
            '<div class="run-row-info">' +
            '<span class="run-num">Run ' +
            (pos + 1) +
            '</span>' +
            '<span class="run-detail">' +
            runSummaryLine(run) +
            (hasTrail ? ' · route ' + syncLabel : '') +
            '</span>' +
            '</div>' +
            '<div class="run-row-actions">' +
            '<button type="button" class="btn btn-secondary btn-detail" data-detail-index="' +
            i +
            '" aria-label="Details for run ' +
            (pos + 1) +
            '">Details</button>' +
            '<button type="button" class="btn btn-ghost btn-trail" data-trail-index="' +
            i +
            '" ' +
            (hasTrail ? '' : 'disabled') +
            ' aria-label="Show trail for run ' +
            (pos + 1) +
            '">' +
            (hasTrail ? 'Trail (' + syncLabel + ')' : 'No trail') +
            '</button>' +
            '<button type="button" class="btn btn-delete" data-index="' +
            i +
            '" aria-label="Delete run ' +
            (pos + 1) +
            '">' +
            ICON_TRASH +
            ' Delete</button>' +
            '</div>'
          list.appendChild(row)
        })
      }

      function updateBadge() {
        const n = runs.length
        const el = document.getElementById('runBadge')
        el.textContent = n === 1 ? '1 run' : n + ' runs'
      }

      function formatPaceClock(minPerMi) {
        if (!isFinite(minPerMi) || minPerMi <= 0 || minPerMi > 999) return null
        const totalSec = Math.round(minPerMi * 60)
        const mm = Math.floor(totalSec / 60)
        const ss = totalSec % 60
        return mm + ':' + String(ss).padStart(2, '0')
      }

      function resetPacePreview() {
        const el = document.getElementById('pacePreview')
        el.classList.add('muted')
        el.textContent = 'Enter distance and time to preview pace.'
      }

      function updatePacePreview() {
        const el = document.getElementById('pacePreview')
        const dMi = distanceInputToMiles(document.getElementById('dist').value)
        const t = parseFloat(document.getElementById('time').value)
        el.classList.remove('muted')
        if (Number.isNaN(dMi) || Number.isNaN(t) || document.getElementById('dist').value.trim() === '') {
          el.classList.add('muted')
          el.textContent = 'Enter distance and time to preview pace.'
          return
        }
        if (dMi <= 0) {
          el.classList.add('muted')
          el.textContent = 'Distance must be greater than zero for pace.'
          return
        }
        if (t < 0) {
          el.classList.add('muted')
          el.textContent = 'Time cannot be negative.'
          return
        }
        const paceTxt = formatPaceForRun(dMi, t)
        if (!paceTxt) {
          el.classList.add('muted')
          el.textContent = 'Pace preview unavailable.'
          return
        }
        const paceParts = paceTxt.split(' ')
        const clock = paceParts[0]
        const rest = paceParts.slice(1).join(' ')
        el.innerHTML = 'Pace ~<strong>' + clock + '</strong> ' + rest
      }

      function renderRunsList() {
        const empty = document.getElementById('runsEmpty')
        const list = document.getElementById('runsList')
        const emptyTitle = document.getElementById('runsEmptyTitle')
        const emptyHint = document.getElementById('runsEmptyHint')
        list.innerHTML = ''
        renderStreakChallengeCard()
        renderTrailMonitor()
        if (runsLoading) {
          empty.hidden = true
          list.hidden = false
          for (let s = 0; s < 6; s++) {
            const sk = document.createElement('div')
            sk.className = 'skeleton-row'
            sk.setAttribute('aria-hidden', 'true')
            list.appendChild(sk)
          }
          renderSearchResults()
          return
        }
        if (runs.length === 0) {
          if (emptyTitle) emptyTitle.textContent = 'Log your first run'
          if (emptyHint)
            emptyHint.textContent =
              'Use the Home tab to add a run, connect Smashrun in Settings, then open Runs to sync.'
          empty.hidden = false
          list.hidden = true
          renderSearchResults()
          return
        }
        const indices = getSortedFilteredIndices()
        if (indices.length === 0) {
          if (emptyTitle) emptyTitle.textContent = 'No runs match'
          if (emptyHint)
            emptyHint.textContent =
              runsFilter === 'week'
                ? 'No runs in the last 7 days. Try All or add a new run from Home.'
                : 'Adjust filters or sync again from Smashrun.'
          empty.hidden = false
          list.hidden = true
          renderSearchResults()
          return
        }
        if (emptyTitle) emptyTitle.textContent = 'Log your first run'
        if (emptyHint)
          emptyHint.textContent = 'Use the Home tab to add a run, then open Runs here to see your list.'
        empty.hidden = true
        list.hidden = false
        const trailStore = readTrailsStore()
        indices.forEach((i, pos) => {
          const run = runs[i]
          const hasTrail = hasSavedTrail(run, i, trailStore)
          const trailEntry = getTrailEntry(run, i, trailStore)
          const syncLabel = hasTrail ? trailSyncStateLabel(trailEntry && trailEntry.sync_state) : 'no trail'
          const row = document.createElement('div')
          row.className = 'run-row'
          row.setAttribute('role', 'listitem')
          row.dataset.runIndex = String(i)
          row.innerHTML =
            '<div class="run-row-info">' +
            '<span class="run-num">Run ' +
            (pos + 1) +
            '</span>' +
            '<span class="run-detail">' +
            runSummaryLine(run) +
            (hasTrail ? ' · route ' + syncLabel : '') +
            '</span>' +
            '</div>' +
            '<div class="run-row-actions">' +
            '<button type="button" class="btn btn-secondary btn-detail" data-detail-index="' +
            i +
            '" aria-label="Details for run ' +
            (pos + 1) +
            '">Details</button>' +
            '<button type="button" class="btn btn-ghost btn-trail' +
            (hasTrail ? '" title="Saved GPS trail"' : '" title="No trail saved"') +
            '" data-trail-index="' +
            i +
            '" ' +
            (hasTrail ? '' : 'disabled') +
            ' aria-label="' +
            (hasTrail ? 'Show trail on map for run ' : 'No trail for run ') +
            (pos + 1) +
            '">' +
            (hasTrail ? 'Trail (' + syncLabel + ')' : 'No trail') +
            '</button>' +
            '<button type="button" class="btn btn-delete" data-index="' +
            i +
            '" aria-label="Delete run ' +
            (pos + 1) +
            '">' +
            ICON_TRASH +
            ' Delete</button>' +
            '</div>'
          list.appendChild(row)
        })
        refreshTrailRunSelect()
        renderSearchResults()
        renderStreakChallengeCard()
        renderTrailMonitor()
      }

      function calculatePaceMinPerMile(distanceMiles, timeMinutes) {
        return timeMinutes / distanceMiles
      }

      function syncLogMirrors() {
        const out = document.getElementById('out')
        const outLog = document.getElementById('outLog')
        if (!out || !outLog) return
        outLog.textContent = out.textContent
        outLog.scrollTop = outLog.scrollHeight
      }

      function log(line) {
        const out = document.getElementById('out')
        out.textContent += line + '\n'
        out.scrollTop = out.scrollHeight
        syncLogMirrors()
      }

      function formatWeatherLine(data) {
        const loc = data.location_label ? data.location_label + ' · ' : ''
        return (
          loc +
          Math.round(data.temperature_f) +
          '°F · ' +
          data.condition +
          ' · wind ' +
          Math.round(data.wind_mph) +
          ' mph · ' +
          data.humidity +
          '% humidity'
        )
      }

      function loadWeatherForPlace() {
        const el = document.getElementById('weatherText')
        const raw = document.getElementById('weatherPlaceQuery').value.trim()
        if (raw.length < 2) {
          el.textContent = 'Type at least 2 characters (city or postal code).'
          return
        }
        el.textContent = 'Looking up place…'
        fetch('/api/weather/place?q=' + encodeURIComponent(raw))
          .then((r) => r.json())
          .then((data) => {
            if (data.error) throw new Error(data.error || 'weather')
            el.textContent = formatWeatherLine(data)
            log('Weather: ' + el.textContent)
            renderTodayHub()
          })
          .catch(() => {
            el.textContent =
              'Place not found or weather failed — try \"City, Country\" or add a country for ZIP/postal codes.'
            renderTodayHub()
          })
      }

      function loadWeatherForLocation() {
        const el = document.getElementById('weatherText')
        if (!el) return
        if (!navigator.geolocation) {
          el.textContent =
            'GPS not available here — use the city/ZIP box below instead.'
          return
        }
        el.textContent = 'Getting your location…'
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude
            const lon = pos.coords.longitude
            el.textContent = 'Loading forecast…'
            const q = 'lat=' + encodeURIComponent(lat) + '&lon=' + encodeURIComponent(lon)
            fetch('/api/weather?' + q)
              .then((r) => r.json())
              .then((data) => {
                if (data.error) throw new Error(data.error || 'weather')
                el.textContent = formatWeatherLine(data)
                log('Weather near you: ' + el.textContent)
                renderTodayHub()
              })
              .catch(() => {
                el.textContent =
                  'Weather service failed — tap to retry, or search by city below.'
                renderTodayHub()
              })
          },
          () => {
            el.textContent =
              'Location blocked or denied. Allow location for this site in your browser (lock icon), or on Mac: System Settings → Privacy & Security → Location Services. Easiest: type a city in the box below.'
            renderTodayHub()
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 }
        )
      }

      function printMenuBanner() {
        log('')
        log('── allRunners ──')
        log('1) Add a run')
        log('2) View all runs')
        log('3) Quit')
      }

      function viewRuns() {
        if (runs.length === 0) {
          log('No runs recorded yet. Tap “Add a run” to start.')
          return
        }
        runs.forEach((run, i) => {
          log('Run ' + (i + 1) + ': ' + runSummaryLine(run))
        })
      }

      const addPanel = document.getElementById('addPanel')

      document.getElementById('dist').addEventListener('input', updatePacePreview)
      document.getElementById('time').addEventListener('input', updatePacePreview)

      function openAddRunPanel() {
        setTab('home')
        printMenuBanner()
        log('Choice: 1 — Add a run')
        const rd = document.getElementById('runDate')
        if (rd && !rd.value) rd.value = todayISO()
        const noteEl = document.getElementById('runNote')
        if (noteEl && !noteEl.value.trim()) {
          noteEl.value = featureState.coachMoodSoreness >= 4 ? 'Easy recovery focus.' : ''
        }
        updateDistanceLabels()
        addPanel.classList.add('open')
        addPanel.setAttribute('aria-hidden', 'false')
        updatePacePreview()
        // Add panel now sits below feature cards; scroll so it is visible immediately.
        addPanel.scrollIntoView({ behavior: 'smooth', block: 'start' })
        const distEl = document.getElementById('dist')
        if (distEl) {
          try {
            distEl.focus({ preventScroll: true })
          } catch (_) {
            distEl.focus()
          }
        }
      }

      document.getElementById('m1').addEventListener('click', openAddRunPanel)

      document.getElementById('cancelAdd').addEventListener('click', () => {
        addPanel.classList.remove('open')
        addPanel.setAttribute('aria-hidden', 'true')
        document.getElementById('dist').value = ''
        document.getElementById('time').value = ''
        document.getElementById('runDate').value = todayISO()
        const noteEl = document.getElementById('runNote')
        if (noteEl) noteEl.value = ''
        resetPacePreview()
      })

      document.getElementById('submitRun').addEventListener('click', async () => {
        if (!validateAddForm()) {
          showToast('Fix the highlighted fields before saving.', 'warn')
          return
        }
        const dMi = distanceInputToMiles(document.getElementById('dist').value)
        const t = parseFloat(document.getElementById('time').value)
        const dateStr = document.getElementById('runDate').value.trim()
        const note = String((document.getElementById('runNote').value || '').trim()).slice(0, 240)
        const autoTags = autoTagsFromNote(note)
        try {
          const externalId = await stableExternalId(dateStr, dMi, t)
          const saved = await apiJson('/api/runs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              distance: dMi,
              time: t,
              date: dateStr,
              notes: note ? note + (autoTags.length ? ' #' + autoTags.join(' #') : '') : '',
              externalId,
            }),
          })
          await syncRunsFromBackend(false)
          log(
            'Date: ' +
              dateStr +
              ' · Distance (mi internal): ' +
              dMi.toFixed(4) +
              ' · Time (min): ' +
              t
          )
          if (saved && saved.saved === 'smashrun') {
            log('Run saved on this computer and synced to Smashrun.')
            showToast('Run saved and synced to Smashrun.', 'ok')
          } else if (saved && saved.smashrun_error) {
            log('Run saved on this computer. Smashrun sync failed.')
            showToast('Run saved on this computer. Smashrun sync failed.', 'warn')
          } else {
            log('Run saved on this computer.')
            showToast('Run saved on this computer.', 'ok')
          }
          document.getElementById('dist').value = ''
          document.getElementById('time').value = ''
          document.getElementById('runDate').value = todayISO()
          document.getElementById('runNote').value = ''
          clearFieldErrors()
          resetPacePreview()
          addPanel.classList.remove('open')
          addPanel.setAttribute('aria-hidden', 'true')
          setTab('runs')
          updateOnboardingSteps()
        } catch (err) {
          const plain = explainApiError(err.code, err.message || 'request failed')
          log('Run save failed: ' + plain)
          showToast(plain, 'warn')
        }
      })

      document.getElementById('m2').addEventListener('click', () => {
        setTab('runs')
        syncRunsFromBackend(false)
        printMenuBanner()
        log('Choice: 2 — View all runs')
        viewRuns()
      })

      document.getElementById('m3').addEventListener('click', () => {
        printMenuBanner()
        log('Choice: 3 — Quit')
        log('See you on the next run.')
      })

      function openDeleteModal(index) {
        const run = runs[index]
        if (!run) return
        deleteModalFocusBefore = document.activeElement
        pendingDeleteIndex = index
        document.getElementById('deleteModalDetail').textContent =
          'Run ' + (index + 1) + ': ' + runSummaryLine(run)
        document.getElementById('deleteModal').hidden = false
        document.getElementById('deleteModalCancel').focus()
      }

      function closeDeleteModal() {
        document.getElementById('deleteModal').hidden = true
        pendingDeleteIndex = null
        if (deleteModalFocusBefore && typeof deleteModalFocusBefore.focus === 'function') {
          try {
            deleteModalFocusBefore.focus()
          } catch (_) {}
        }
        deleteModalFocusBefore = null
      }

      function handleDeleteClick(e) {
        const btn = e.target.closest('button[data-index]')
        if (!btn || !btn.classList.contains('btn-delete')) return
        const i = parseInt(btn.getAttribute('data-index'), 10)
        if (Number.isNaN(i) || i < 0 || i >= runs.length) return
        openDeleteModal(i)
      }

      function handleTrailClick(e) {
        const btn = e.target.closest('button[data-trail-index]')
        if (!btn || !btn.classList.contains('btn-trail')) return
        const i = parseInt(btn.getAttribute('data-trail-index'), 10)
        if (Number.isNaN(i) || i < 0 || i >= runs.length) return
        setTab('map')
        refreshRunMapLayout()
        if (!loadSavedTrailForIndex(i, true)) {
          setTrailStatus('No saved trail for run #' + (i + 1) + '.')
          return
        }
        log('Loaded trail for run #' + (i + 1) + '.')
      }

      function handleDetailClick(e) {
        const btn = e.target.closest('button[data-detail-index]')
        if (!btn || !btn.classList.contains('btn-detail')) return
        const i = parseInt(btn.getAttribute('data-detail-index'), 10)
        if (Number.isNaN(i) || i < 0 || i >= runs.length) return
        openRunDetail(i).catch(() => {})
      }

      document.getElementById('runsList').addEventListener('click', handleDeleteClick)
      document.getElementById('searchRunsList').addEventListener('click', handleDeleteClick)
      document.getElementById('runsList').addEventListener('click', handleTrailClick)
      document.getElementById('searchRunsList').addEventListener('click', handleTrailClick)
      document.getElementById('runsList').addEventListener('click', handleDetailClick)
      document.getElementById('searchRunsList').addEventListener('click', handleDetailClick)

      document.getElementById('searchDate').addEventListener('input', renderSearchResults)
      document.getElementById('clearSearchDate').addEventListener('click', () => {
        document.getElementById('searchDate').value = ''
        renderSearchResults()
      })

      document.getElementById('deleteModalCancel').addEventListener('click', closeDeleteModal)

      document.getElementById('deleteModalConfirm').addEventListener('click', async () => {
        if (pendingDeleteIndex === null) return
        const i = pendingDeleteIndex
        const removed = i + 1
        const run = runs[i]
        try {
          if (run) {
            const store = readTrailsStore()
            const key = trailRunKey(run, i)
            if (store[key]) {
              delete store[key]
              writeTrailsStore(store)
            }
          }
          if (run && run.id) {
            await apiJson('/api/runs/' + encodeURIComponent(run.id), { method: 'DELETE' })
          }
          closeDeleteModal()
          await syncRunsFromBackend(false)
          log('Deleted run #' + removed + '.')
          showToast('Run removed.', 'ok')
        } catch (err) {
          closeDeleteModal()
          log('Delete failed: ' + (err.message || 'request failed'))
        }
      })

      document.getElementById('deleteModal').addEventListener('click', (e) => {
        if (e.target.id === 'deleteModal') closeDeleteModal()
      })

      document.getElementById('runDetailSaveNotes').addEventListener('click', () => {
        setRunDetailTab('notes')
        saveRunNotes()
      })
      document.getElementById('runDetailClose').addEventListener('click', () => {
        closeRunDetailModal()
      })
      document.getElementById('runDetailModal').addEventListener('click', (e) => {
        if (e.target.id === 'runDetailModal') closeRunDetailModal()
      })
      document.getElementById('runDetailSplitsKm').addEventListener('click', async () => {
        if (runDetailIndex === null) return
        const run = runs[runDetailIndex]
        if (!run || !run.id) return
        setRunDetailTab('splits')
        setRunDetailStatus('')
        try {
          const splits = await apiJson('/api/runs/' + encodeURIComponent(run.id) + '/splits/km')
          renderSplitsTable('km', splits)
        } catch (err) {
          document.getElementById('runDetailSplitsWrap').innerHTML =
            '<p class="dash-tile-sub" style="margin:0">Splits failed: ' + (err.message || 'request failed') + '</p>'
        }
      })
      document.getElementById('runDetailSplitsMi').addEventListener('click', async () => {
        if (runDetailIndex === null) return
        const run = runs[runDetailIndex]
        if (!run || !run.id) return
        setRunDetailTab('splits')
        setRunDetailStatus('')
        try {
          const splits = await apiJson('/api/runs/' + encodeURIComponent(run.id) + '/splits/mi')
          renderSplitsTable('mi', splits)
        } catch (err) {
          document.getElementById('runDetailSplitsWrap').innerHTML =
            '<p class="dash-tile-sub" style="margin:0">Splits failed: ' + (err.message || 'request failed') + '</p>'
        }
      })

      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return
        const runModal = document.getElementById('runDetailModal')
        if (runModal && !runModal.hidden) {
          closeRunDetailModal()
          return
        }
        const modal = document.getElementById('deleteModal')
        if (!modal.hidden) closeDeleteModal()
      })

      document.getElementById('runsToolbarRefresh').addEventListener('click', () => {
        syncRunsFromBackend(true)
      })
      document.getElementById('runsSortSelect').addEventListener('change', (e) => {
        runsSort = e.target.value
        renderRunsList()
      })
      document.getElementById('filterChipAll').addEventListener('click', () => {
        runsFilter = 'all'
        updateFilterChips()
        renderRunsList()
      })
      document.getElementById('filterChipWeek').addEventListener('click', () => {
        runsFilter = 'week'
        updateFilterChips()
        renderRunsList()
      })

      document.getElementById('detailTabNotes').addEventListener('click', () => setRunDetailTab('notes'))
      document.getElementById('detailTabSplits').addEventListener('click', () => setRunDetailTab('splits'))
      document.getElementById('detailTabTags').addEventListener('click', () => setRunDetailTab('tags'))
      document.getElementById('detailTabNotables').addEventListener('click', () => setRunDetailTab('notables'))

      document.getElementById('reconnectBannerBtn').addEventListener('click', () => {
        window.location.href = '/api/smashrun/login'
      })
      document.getElementById('reconnectBannerClose').addEventListener('click', () => hideReconnectBanner())

      document.getElementById('onboardingDismiss').addEventListener('click', () => {
        try {
          localStorage.setItem(ONBOARD_KEY, '1')
        } catch (_) {}
        const c = document.getElementById('onboardingCard')
        if (c) c.hidden = true
      })

      document.getElementById('runDate').value = todayISO()
      updateTrailButtons()
      refreshTrailRunSelect()
      const autoSyncToggle = document.getElementById('mapTrailAutoSync')
      if (autoSyncToggle) autoSyncToggle.checked = readTrailAutoSyncPref()
      setTrailSyncStatusText(
        readTrailAutoSyncPref() ? 'Trail sync status: auto-sync enabled.' : 'Trail sync status: local only.'
      )

      updateFilterChips()
      updateSyncHintIncremental(false)
      updateDistanceLabels()
      updateOnboardingSteps()

      loadLastSyncedFromStorage()

      document.addEventListener('visibilitychange', function () {
        if (document.hidden || !smashrunConnected) return
        const now = Date.now()
        if (lastRunsSyncAt != null && now - lastRunsSyncAt < RUNS_BG_SYNC_MIN_GAP_MS) return
        syncRunsFromBackend(false)
      })

      refreshServiceKeyStatus()
      refreshSmashrunStatus()
      syncRunsFromBackend(false)

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {})
      }

      document.getElementById('weatherBtn').addEventListener('click', loadWeatherForLocation)
      document.getElementById('weatherPlaceBtn').addEventListener('click', loadWeatherForPlace)
      document.getElementById('weatherPlaceQuery').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') loadWeatherForPlace()
      })
      const todayHubStartBtn = document.getElementById('todayHubStartBtn')
      if (todayHubStartBtn) {
        todayHubStartBtn.addEventListener('click', () => openAddRunPanel())
      }

      const hrWatchAutoLogEl = document.getElementById('hrWatchAutoLog')
      if (hrWatchAutoLogEl) {
        hrWatchAutoLogEl.checked = !!featureState.hrWatchAutoLog
        hrWatchAutoLogEl.addEventListener('change', () => {
          featureState.hrWatchAutoLog = !!hrWatchAutoLogEl.checked
          writeFeatureState()
        })
      }
      document.getElementById('hrWatchConnectBtn').addEventListener('click', () => {
        connectHrWatch()
      })
      document.getElementById('hrWatchDisconnectBtn').addEventListener('click', () => {
        disconnectHrWatch()
      })
      updateHrWatchButtons()
      reconnectSavedHrWatch()

      const coachTrendMetricEl = document.getElementById('coachTrendMetric')
      if (coachTrendMetricEl) {
        coachTrendMetricEl.addEventListener('change', () => renderTrendChart())
      }
      const coachTrendCursorEl = document.getElementById('coachTrendCursor')
      if (coachTrendCursorEl) {
        coachTrendCursorEl.addEventListener('input', () => renderTrendChart())
      }
      ;[
        ['coachMoodEnergy', 'coachMoodEnergy'],
        ['coachMoodStress', 'coachMoodStress'],
        ['coachMoodSoreness', 'coachMoodSoreness'],
        ['coachMoodSleep', 'coachMoodSleep'],
      ].forEach(([id, key]) => {
        const el = document.getElementById(id)
        if (!el) return
        el.value = String(featureState[key] || 3)
        el.addEventListener('change', () => {
          featureState[key] = Math.max(1, Math.min(5, Number(el.value) || 3))
          writeFeatureState()
          renderDynamicCoach()
        })
      })
      renderDynamicCoach()
      renderTodayHub()

      const SpeechApi = window.SpeechRecognition || window.webkitSpeechRecognition
      const runNoteVoiceBtn = document.getElementById('runNoteVoiceBtn')
      const runNoteVoiceStatus = document.getElementById('runNoteVoiceStatus')
      if (runNoteVoiceBtn && SpeechApi) {
        speechRecognizer = new SpeechApi()
        speechRecognizer.lang = 'en-US'
        speechRecognizer.interimResults = false
        speechRecognizer.maxAlternatives = 1
        speechRecognizer.addEventListener('result', (evt) => {
          const text = String(evt.results?.[0]?.[0]?.transcript || '').trim()
          if (!text) return
          const noteEl = document.getElementById('runNote')
          if (!noteEl) return
          noteEl.value = (noteEl.value ? noteEl.value + ' ' : '') + text
          if (runNoteVoiceStatus) runNoteVoiceStatus.textContent = 'Voice captured.'
        })
        speechRecognizer.addEventListener('error', () => {
          if (runNoteVoiceStatus) runNoteVoiceStatus.textContent = 'Voice capture failed. You can type instead.'
        })
        runNoteVoiceBtn.addEventListener('click', () => {
          try {
            if (runNoteVoiceStatus) runNoteVoiceStatus.textContent = 'Listening…'
            speechRecognizer.start()
          } catch (_) {}
        })
      } else if (runNoteVoiceBtn) {
        runNoteVoiceBtn.disabled = true
        if (runNoteVoiceStatus) runNoteVoiceStatus.textContent = 'Voice note is not supported in this browser.'
      }

      document.getElementById('nextTipBtn').addEventListener('click', () => {
        featureState.tipIndex =
          (featureState.tipIndex + 1) % RUN_TECHNIQUE_TRICKS.length
        writeFeatureState()
        renderPersonalizedRunningPlan()
      })

      document.getElementById('footProfileSelect').addEventListener('change', () => {
        featureState.footProfile = document.getElementById('footProfileSelect').value
        writeFeatureState()
        renderPersonalizedRunningPlan()
      })

      document.getElementById('remindNowBtn').addEventListener('click', () => {
        sendTrackReminder()
      })
      document.getElementById('remindLaterBtn').addEventListener('click', () => {
        scheduleTrackReminder(30)
        showToast('Reminder set for 30 minutes.', 'ok')
      })

      document.getElementById('challengeFriendBtn').addEventListener('click', () => {
        const input = document.getElementById('friendHandleInput')
        const handle = String((input.value || '').trim()).slice(0, 24)
        if (!handle) {
          showToast('Enter a friend handle first.', 'warn')
          return
        }
        featureState.friendHandle = handle
        featureState.challengeDay = localDateStamp()
        writeFeatureState()
        renderStreakChallengeCard()
        showToast('Saved on this device. Nothing was sent to ' + handle + '.', 'ok')
      })

      document.getElementById('communityJoinBtn').addEventListener('click', () => {
        if (!featureState.joinedCommunity) {
          featureState.joinedCommunity = true
          featureState.communityPosts.push('Private log started on this device.')
          featureState.communityPosts = featureState.communityPosts.slice(-20)
          writeFeatureState()
          renderCommunityCard()
          showToast('Private log started. Notes stay on this device.', 'ok')
        }
      })

      document.getElementById('communityPostBtn').addEventListener('click', () => {
        const input = document.getElementById('communityPostInput')
        const msg = String((input.value || '').trim())
        if (!msg) return
        if (!featureState.joinedCommunity) {
          showToast('Start the private log first. Notes stay on this device.', 'warn')
          return
        }
        const line = localDateStamp() + ' · ' + msg.slice(0, 120)
        featureState.communityPosts.push(line)
        featureState.communityPosts = featureState.communityPosts.slice(-20)
        writeFeatureState()
        renderCommunityCard()
        input.value = ''
      })

      document.getElementById('musicLoadBtn').addEventListener('click', () => {
        if (musicSource === 'apple') {
          ensureAppleReadyAndAuthorized().then(async (ok) => {
            if (!ok || !appleMusicKit) return
            const songId = String((document.getElementById('appleSongIdInput').value || '').trim())
            if (!songId) {
              setAppleMusicStatus('No song ID provided. Using current Apple queue.', true)
              return
            }
            try {
              await appleMusicKit.setQueue({ songs: [songId] })
              const desc = appleNowPlayingDescriptor()
              if (desc) {
                setMusicNowText('Loaded Apple song: ' + desc.title + ' · ' + desc.subtitle)
                rememberRecentDescriptor(desc)
              } else {
                setMusicNowText('Loaded Apple song ID: ' + songId)
              }
              setAppleMusicStatus('Apple queue loaded.', true)
            } catch (err) {
              setAppleMusicStatus('Could not load that Apple song ID.', false)
              showToast('Apple queue load failed: ' + (err.message || 'error'), 'warn')
            }
          })
          return
        }
        const sel = document.getElementById('musicTrackSelect')
        const id = sel && sel.value ? sel.value : MUSIC_LIBRARY[0].id
        selectMusicTrackById(id, false)
      })
      document.getElementById('musicPlayPauseBtn').addEventListener('click', () => {
        if (musicSource === 'apple') {
          ensureAppleReadyAndAuthorized().then(async (ok) => {
            if (!ok || !appleMusicKit) return
            try {
              if (appleMusicKit.isPlaying) {
                await appleMusicKit.pause()
                setMusicPlayButton(false)
              } else {
                await appleMusicKit.play()
                setMusicPlayButton(true)
              }
            } catch (err) {
              showToast('Apple playback failed: ' + (err.message || 'error'), 'warn')
            }
          })
          return
        }
        if (!musicAudioEl) return
        if (!musicAudioEl.src) {
          selectMusicTrackById(MUSIC_LIBRARY[0].id, false)
        }
        if (musicAudioEl.paused) {
          musicAudioEl
            .play()
            .then(() => {
              setMusicPlayButton(true)
            })
            .catch(() => {
              showToast('Audio playback was blocked. Tap Play again.', 'warn')
            })
        } else {
          musicAudioEl.pause()
          setMusicPlayButton(false)
        }
      })
      document.getElementById('musicPrevBtn').addEventListener('click', () => {
        if (musicSource === 'apple') {
          ensureAppleReadyAndAuthorized().then(async (ok) => {
            if (!ok || !appleMusicKit) return
            try {
              await appleMusicKit.skipToPreviousItem()
            } catch (err) {
              showToast('Apple previous failed: ' + (err.message || 'error'), 'warn')
            }
          })
          return
        }
        shiftMusicTrack(-1)
      })
      document.getElementById('musicNextBtn').addEventListener('click', () => {
        if (musicSource === 'apple') {
          ensureAppleReadyAndAuthorized().then(async (ok) => {
            if (!ok || !appleMusicKit) return
            try {
              await appleMusicKit.skipToNextItem()
            } catch (err) {
              showToast('Apple next failed: ' + (err.message || 'error'), 'warn')
            }
          })
          return
        }
        shiftMusicTrack(1)
      })
      document.getElementById('musicRestartBtn').addEventListener('click', () => {
        if (musicSource === 'apple') {
          ensureAppleReadyAndAuthorized().then(async (ok) => {
            if (!ok || !appleMusicKit) return
            try {
              await appleMusicKit.seekToTime(0)
              if (!appleMusicKit.isPlaying) await appleMusicKit.play()
            } catch (err) {
              showToast('Apple restart failed: ' + (err.message || 'error'), 'warn')
            }
          })
          return
        }
        if (!musicAudioEl) return
        musicAudioEl.currentTime = 0
        if (musicAudioEl.paused) {
          musicAudioEl.play().catch(() => {})
        }
      })
      document.getElementById('musicSearchBtn').addEventListener('click', () => {
        const q = String(document.getElementById('musicSearchInput').value || '').trim()
        if (!q) {
          showToast('Type a mood or title keyword.', 'warn')
          return
        }
        if (musicSource === 'apple') {
          document.getElementById('appleSongIdInput').value = q
          showToast('Set song ID to "' + q + '". Tap Load in Apple mode.', 'ok')
          return
        }
        const query = q.toLowerCase()
        const match =
          MUSIC_LIBRARY.find((t) => t.title.toLowerCase().includes(query)) ||
          MUSIC_LIBRARY.find((t) => t.mood.toLowerCase().includes(query))
        if (!match) {
          showToast('No direct match; loading a random track.', 'warn')
          const random = MUSIC_LIBRARY[Math.floor(Math.random() * MUSIC_LIBRARY.length)]
          selectMusicTrackById(random.id, true)
          return
        }
        selectMusicTrackById(match.id, true)
      })
      function openMusicUrl(url) {
        try {
          window.open(url, '_blank', 'noopener')
        } catch (_) {
          window.location.href = url
        }
      }
      document.getElementById('musicSpotifyBtn').addEventListener('click', () => {
        openMusicUrl('https://open.spotify.com/search/running%20playlist')
      })
      document.getElementById('musicAppleBtn').addEventListener('click', () => {
        openMusicUrl('https://music.apple.com/us/search?term=running%20playlist')
      })
      document.getElementById('musicYoutubeBtn').addEventListener('click', () => {
        openMusicUrl('https://music.youtube.com/search?q=running+playlist')
      })
      document.getElementById('musicSourceApplyBtn').addEventListener('click', () => {
        const val = document.getElementById('musicSourceSelect').value
        setMusicSource(val)
      })
      document.getElementById('appleInitBtn').addEventListener('click', () => {
        initAppleMusicKit()
      })
      document.getElementById('appleAuthBtn').addEventListener('click', () => {
        ensureAppleReadyAndAuthorized()
      })
      document.getElementById('musicRecentList').addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-track-id]')
        if (!btn) return
        const src = btn.getAttribute('data-track-source') || 'local'
        const id = btn.getAttribute('data-track-id') || ''
        if (src === 'apple') {
          setMusicSource('apple')
          document.getElementById('appleSongIdInput').value = id
          document.getElementById('musicLoadBtn').click()
        } else {
          setMusicSource('local')
          selectMusicTrackById(id, true)
        }
      })

      printMenuBanner()
      log('Pick an action above to begin.')
      log('Saved runs appear under “Your runs” — use Delete to confirm removal.')
      setupMusicPlayer()
      renderPersonalizedRunningPlan()
      renderHeartRateCard()
      renderCommunityCard()
      window.addEventListener('online', () => {
        showToast('Back online — reconciling local and cloud runs.', 'ok')
        syncRunsFromBackend(false)
        renderTodayHub()
      })
      window.addEventListener('offline', () => {
        showToast('You are offline. Runs will save locally and reconcile later.', 'warn')
        renderTodayHub()
      })
      renderStreakChallengeCard()
      renderTrailMonitor()
      updateBadge()
      renderRunsList()
