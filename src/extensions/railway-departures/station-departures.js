(() => {
    const RECENT_DEPARTURE_GRACE_MS = 10 * 60 * 1000;
    const BLINK_INTERVAL_SECONDS = 0.4;
    const LENS_COLOR = "#ff9d1c";
    const DEFAULT_LENS_LEAD_SECONDS = 90;
    const textCompare = new Intl.Collator("cs", { sensitivity: "base", numeric: true });

    const table = document.querySelector("#departuresTable");
    const tableBody = document.querySelector("#departuresTableBody");
    const emptyState = document.querySelector("#departuresEmptyState");
    const legend = document.querySelector("#departuresLegend");

    let feed = {
        departures: [],
        station: "",
        lensLeadSeconds: DEFAULT_LENS_LEAD_SECONDS,
        revision: 0,
        error: ""
    };
    let sortState = { key: "departureTime", direction: "asc" };
    let lensTimer = 0;

    const positiveModulo = (value, divisor) =>
        ((value % divisor) + divisor) % divisor;

    const lensLeadSeconds = () => {
        const value = Number(feed.lensLeadSeconds);
        return Number.isFinite(value) && value >= 0
            ? Math.round(value)
            : DEFAULT_LENS_LEAD_SECONDS;
    };

    // Same instant as getEffectiveDepartureDate in station-table.mjs:
    // scheduled clock plus the raw delay, kept today through the 10-minute
    // clearing window, otherwise rolled to the next calendar day.
    const getEffectiveDepartureDate = (departureTime, delayMinutes, now = new Date()) => {
        const match = String(departureTime).match(/^(\d{1,2}):(\d{2})$/);
        if (!match) return null;
        const dep = new Date(now);
        dep.setHours(Number(match[1]), Number(match[2]), 0, 0);

        const delay = Number(delayMinutes || 0);
        if (Number.isFinite(delay)) {
            dep.setMinutes(dep.getMinutes() + delay);
        }

        const referenceMinute = new Date(now);
        referenceMinute.setSeconds(0, 0);
        const recentDeparture = referenceMinute.getTime() - dep.getTime()
            <= RECENT_DEPARTURE_GRACE_MS;
        if (dep < now && !recentDeparture) {
            dep.setDate(dep.getDate() + 1);
        }

        return dep;
    };

    const parseDelayMinutes = (value) => {
        if (value === "" || value === null || value === undefined) return 0;
        const text = String(value).trim();
        const match = text.match(/^(\d+(?:[.,]\d+)?)\s*min\.?$/i);
        const numeric = Number(match ? match[1].replace(",", ".") : value);
        return Number.isFinite(numeric) && numeric >= 0 ? Math.floor(numeric) : 0;
    };

    const clockParts = (value) => {
        const match = String(value ?? "").trim().match(/^(\d{1,2}):(\d{2})$/);
        if (!match) return null;
        const hours = Number(match[1]);
        const minutes = Number(match[2]);
        if (!Number.isInteger(hours) || hours < 0 || hours > 23) return null;
        if (!Number.isInteger(minutes) || minutes < 0 || minutes > 59) return null;
        return { hours, minutes };
    };

    const minutesSinceClock = (clockDate, reference) => {
        const referenceMinute = new Date(reference.getTime());
        referenceMinute.setSeconds(0, 0);
        return referenceMinute.getTime() - clockDate.getTime();
    };

    const getDepartureSortTimestamp = (departureTime, delay, now = new Date()) => {
        const parts = clockParts(departureTime);
        if (!parts) return Number.POSITIVE_INFINITY;
        const reference = now instanceof Date ? now : new Date(now);
        if (Number.isNaN(reference.getTime())) return Number.POSITIVE_INFINITY;

        const date = new Date(reference.getTime());
        date.setSeconds(0, 0);
        date.setHours(parts.hours, parts.minutes, 0, 0);

        const delayMinutes = parseDelayMinutes(delay);
        const effective = new Date(date.getTime());
        if (delayMinutes > 0) {
            effective.setMinutes(effective.getMinutes() + delayMinutes);
        }

        if (minutesSinceClock(effective, reference) > RECENT_DEPARTURE_GRACE_MS) {
            date.setDate(date.getDate() + 1);
        }

        return date.getTime();
    };

    const displayText = (value) => {
        const text = String(value ?? "").trim();
        return text || "—";
    };

    const sortValue = (departure, now) => {
        switch (sortState.key) {
            case "stationOne":
                return departure.stations?.[0] || "";
            case "stationTwo":
                return departure.stations?.[1] || "";
            case "train":
                return departure.train || "";
            case "trainNumber":
                return departure.trainNumber || "";
            case "operator":
                return departure.operator || "";
            case "delay":
                return Number(departure.delay || 0);
            case "platform":
                return departure.platform || "";
            case "track":
                return departure.track || "";
            case "sector":
                return departure.sector || "";
            case "line":
                return departure.line || "";
            case "note":
                return departure.note || "";
            case "departureTime":
            default:
                return getDepartureSortTimestamp(
                    departure.departureTime,
                    departure.delay,
                    now
                );
        }
    };

    const sortedDepartures = (now) => [...(feed.departures || [])].sort((first, second) => {
        const left = sortValue(first, now);
        const right = sortValue(second, now);
        const comparison = typeof left === "number" && typeof right === "number"
            ? left - right
            : textCompare.compare(String(left), String(right));
        return (sortState.direction === "desc" ? -1 : 1) * comparison
            || textCompare.compare(String(first.id || ""), String(second.id || ""));
    });

    const lensesOn = (departure, now) => {
        const effective = getEffectiveDepartureDate(
            departure.departureTime,
            departure.delay,
            now
        );
        if (!effective) return false;
        return now.getTime() >= effective.getTime() - (lensLeadSeconds() * 1000);
    };

    const blinkPhase = (nowMs, lensIndex) => {
        const period = BLINK_INTERVAL_SECONDS * 2;
        const globalPhase = positiveModulo(nowMs / 1000, period);
        const lensOffset = Math.abs(Number(lensIndex) || 0) * BLINK_INTERVAL_SECONDS;
        return positiveModulo(globalPhase + lensOffset, period);
    };

    const appendCell = (row, value, className = "") => {
        const cell = document.createElement("td");
        if (className) cell.className = className;
        cell.textContent = value;
        row.appendChild(cell);
    };

    const render = () => {
        const now = new Date();
        const rows = sortedDepartures(now);
        tableBody.replaceChildren();

        rows.forEach((departure) => {
            const row = document.createElement("tr");
            const lensCell = document.createElement("td");
            lensCell.className = "departure-lens-status";
            const on = lensesOn(departure, now);
            for (let index = 0; index < 2; index += 1) {
                const symbol = document.createElement("span");
                symbol.className = "lens-status-symbol";
                symbol.classList.toggle("is-on", on);
                symbol.classList.toggle("is-blinking", on);
                symbol.style.setProperty("--status-color", LENS_COLOR);
                symbol.style.setProperty(
                    "--lens-blink-duration",
                    `${BLINK_INTERVAL_SECONDS * 2}s`
                );
                symbol.style.setProperty(
                    "--lens-blink-delay",
                    `${-blinkPhase(now.getTime(), index)}s`
                );
                symbol.textContent = "●";
                symbol.setAttribute(
                    "aria-label",
                    `${index + 1}. čočka ${on ? "svítí" : "nesvítí"}`
                );
                lensCell.appendChild(symbol);
            }
            row.appendChild(lensCell);

            const cells = [
                displayText(departure.operator),
                displayText(departure.train),
                displayText(departure.trainNumber),
                displayText(departure.stations?.[0]),
                displayText(departure.stations?.[1]),
                displayText(departure.departureTime),
                departure.delay === "" || departure.delay === null || departure.delay === undefined
                    ? "—"
                    : `${departure.delay} min`,
                displayText(departure.platform),
                displayText(departure.track),
                String(departure.sector ?? "").trim() || "celá kolej",
                displayText(departure.line)
            ];
            cells.forEach((value) => appendCell(row, value));
            appendCell(row, displayText(departure.note), "departure-note");
            tableBody.appendChild(row);
        });

        const stationName = String(feed.station || "").trim();
        if (stationName) {
            legend.textContent = stationName;
            document.title = stationName;
        }

        const hasRows = rows.length > 0;
        emptyState.hidden = hasRows;
        table.hidden = !hasRows;
        emptyState.textContent = !hasRows && feed.loading
            ? "Načítám odjezdy…"
            : !hasRows && feed.error
                ? feed.error
                : "Stanice nemá žádné odjezdy.";

        table.querySelectorAll("[data-sort-key]").forEach((button) => {
            const header = button.closest("th");
            const active = button.dataset.sortKey === sortState.key;
            header?.setAttribute(
                "aria-sort",
                active
                    ? (sortState.direction === "asc" ? "ascending" : "descending")
                    : "none"
            );
            header?.classList.toggle("is-sorted", active);
        });
        scheduleLenses(now);
    };

    const considerBoundary = (next, time, nowMs) => (
        time > nowMs && (next === null || time < next) ? time : next
    );

    const scheduleLenses = (now) => {
        window.clearTimeout(lensTimer);
        const nowMs = now.getTime();
        const leadMs = lensLeadSeconds() * 1000;
        let next = null;
        for (const departure of feed.departures || []) {
            const effective = getEffectiveDepartureDate(
                departure.departureTime,
                departure.delay,
                now
            );
            if (!effective) continue;
            const activation = effective.getTime() - leadMs;
            next = considerBoundary(next, activation, nowMs);
            if (nowMs >= activation) {
                const limit = effective.getTime() + RECENT_DEPARTURE_GRACE_MS;
                let release = Math.floor(limit / 60000) * 60000;
                if (release <= limit) release += 60000;
                next = considerBoundary(next, release, nowMs);
            }
        }
        const delay = next === null
            ? 60000
            : Math.max(20, Math.min(next - nowMs + 15, 60000));
        lensTimer = window.setTimeout(render, delay);
    };

    table.querySelectorAll("[data-sort-key]").forEach((button) => {
        button.addEventListener("click", () => {
            const key = button.dataset.sortKey;
            sortState = {
                key,
                direction: sortState.key === key && sortState.direction === "asc"
                    ? "desc"
                    : "asc"
            };
            render();
        });
    });

    const pullFeed = async () => {
        try {
            const response = await fetch("/feed", { cache: "no-store" });
            if (!response.ok) return;
            const next = await response.json();
            if (!next || typeof next !== "object") return;
            if (
                next.revision === feed.revision
                && next.url === feed.url
                && next.error === feed.error
                && next.station === feed.station
            ) {
                return;
            }
            feed = {
                departures: Array.isArray(next.departures) ? next.departures : [],
                station: String(next.station || ""),
                lensLeadSeconds: next.lensLeadSeconds,
                revision: Number(next.revision) || 0,
                url: next.url || "",
                error: String(next.error || ""),
                loading: next.loading === true
            };
            render();
        } catch {
            // The next poll retries. Lens timing keeps running on the last feed.
        }
    };

    render();
    void pullFeed();
    window.setInterval(() => void pullFeed(), 1000);
})();
