// ------------------------------------------
// Course Data Model
// ------------------------------------------

class Course {

  // Normalize raw JSON fields and fall back to "N/A" when values are missing or null

  constructor(entry = {}) {
    this._id = typeof entry.id === "string" && entry.id.trim() ? entry.id.trim() : "N/A";
    this._title = typeof entry.title === "string" && entry.title.trim() ? entry.title.trim() : "N/A";
    this._department =
      typeof entry.department === "string" && entry.department.trim()
        ? entry.department.trim()
        : "N/A";
    this._level = typeof entry.level === "number" && !Number.isNaN(entry.level) ? entry.level : null;
    this._credits =
      typeof entry.credits === "number" && !Number.isNaN(entry.credits) ? entry.credits : null;
    this._instructor =
      typeof entry.instructor === "string" && entry.instructor.trim()
        ? entry.instructor.trim()
        : "N/A";
    this._semester =
      typeof entry.semester === "string" && entry.semester.trim() ? entry.semester.trim() : "";
    this._description =
      typeof entry.description === "string" && entry.description.trim()
        ? entry.description.trim()
        : "N/A";
  }

  // Property getters

  get id() {
    return this._id;
  }

  get title() {
    return this._title;
  }

  get department() {
    return this._department;
  }

  get level() {
    return this._level;
  }

  get credits() {
    return this._credits;
  }

  get instructor() {
    return this._instructor;
  }

  get semester() {
    return this._semester || "N/A";
  }

  get description() {
    return this._description;
  }

  // Convert "Season YYYY" into a sortable integer (e.g., Winter 2026 -> 20261) and return null if missing/invalid

  computeTermChronology() {
    if (!this._semester) return null;

    const seasonIndices = {
      Winter: 1,
      Spring: 2,
      Summer: 3,
      Fall: 4,
    };

    const parsed = this._semester.match(/^(Winter|Spring|Summer|Fall)\s+(\d{4})\$/);
    if (!parsed) return null;

    const seasonName = parsed[1];
    const calendarYear = Number(parsed[2]);
    return calendarYear * 10 + seasonIndices[seasonName];
  }

  // Return a single-line summary string for hover tooltips

  buildPlainSummary() {
    return `${this._id} - ${this._title} (${this._department}, ${this.semester})`;
  }

  // Render the full course breakdown into the detail panel

  injectDetailView(hostElement) {
    hostElement.innerHTML = "";

    const headerBlock = document.createElement("div");
    headerBlock.className = "detail-header";

    const codeTag = document.createElement("span");
    codeTag.className = "detail-code-tag";
    codeTag.textContent = this._id;

    const titleHeading = document.createElement("h3");
    titleHeading.textContent = this._title;

    headerBlock.appendChild(codeTag);
    headerBlock.appendChild(titleHeading);
    hostElement.appendChild(headerBlock);

    const summaryStrip = document.createElement("div");
    summaryStrip.className = "summary-strip";

    const topMetrics = [
      ["Level", this._level !== null ? String(this._level) : "N/A"],
      ["Credits", this._credits !== null ? String(this._credits) : "N/A"],
      ["Semester", this.semester],
    ];

    topMetrics.forEach(function (metric) {
      const badge = document.createElement("div");
      badge.className = "summary-badge";

      const keyLabel = document.createElement("strong");
      keyLabel.textContent = metric[0] + ":";

      badge.appendChild(keyLabel);
      badge.appendChild(document.createTextNode(metric[1]));
      summaryStrip.appendChild(badge);
    });

    hostElement.appendChild(summaryStrip);

    const metaList = document.createElement("div");
    metaList.className = "meta-list";

    const secondaryFields = [
      ["Department", this._department],
      ["Instructor", this._instructor],
    ];

    secondaryFields.forEach(function (field) {
      const item = document.createElement("div");
      item.className = "meta-item";

      const fieldName = document.createElement("span");
      fieldName.textContent = field[0] + ":";

      item.appendChild(fieldName);
      item.appendChild(document.createTextNode(field[1]));
      metaList.appendChild(item);
    });

    hostElement.appendChild(metaList);

    const descriptionBody = document.createElement("p");
    descriptionBody.className = "detail-body";
    descriptionBody.textContent = this._description;
    hostElement.appendChild(descriptionBody);
  }
}

// ------------------------------------------
// Application State & DOM References
// ------------------------------------------

let loadedRecords = [];
let selectedCode = null;

const jsonFileControl = document.getElementById("json-file-control");
const alertMessageBox = document.getElementById("alert-message-box");
const filterDepartment = document.getElementById("filter-department");
const filterLevel = document.getElementById("filter-level");
const filterCredits = document.getElementById("filter-credits");
const filterInstructor = document.getElementById("filter-instructor");
const filterSemester = document.getElementById("filter-semester");
const resetFiltersBtn = document.getElementById("reset-filters-btn");
const orderSelect = document.getElementById("order-select");
const courseColumn = document.getElementById("course-column");
const inspectorPane = document.getElementById("inspector-pane");

// ------------------------------------------
// UI State & Error Handling
// ------------------------------------------

// Display a file validation or read error message

function showStatusError(text) {
  alertMessageBox.textContent = text;
}

// Clear any active error message

function clearStatusError() {
  alertMessageBox.textContent = "";
}

// Reset courses, dropdowns, and panels when an invalid file is uploaded

function clearExplorerState() {
  loadedRecords = [];
  selectedCode = null;
  courseColumn.innerHTML = "";
  inspectorPane.innerHTML =
    '<p class="muted-hint">Upload a valid JSON file and select a course code to inspect its details.</p>';
  buildOptionList(filterDepartment, []);
  buildOptionList(filterLevel, []);
  buildOptionList(filterCredits, []);
  buildOptionList(filterInstructor, []);
  buildOptionList(filterSemester, []);
}

// ------------------------------------------
// Filter Dropdown Setup
// ------------------------------------------

// Deduplicate and sort values to populate a filter <select> menu

function buildOptionList(dropdownEl, items, numericSort = false) {
  dropdownEl.innerHTML = '<option value="All">All</option>';

  const distinctValues = Array.from(new Set(items)).filter(function (entry) {
    return entry !== null && entry !== undefined && entry !== "";
  });

  distinctValues.sort(function (first, second) {
    return numericSort
      ? Number(first) - Number(second)
      : String(first).localeCompare(String(second));
  });

  distinctValues.forEach(function (entry) {
    const opt = document.createElement("option");
    opt.value = String(entry);
    opt.textContent = String(entry);
    dropdownEl.appendChild(opt);
  });
}

// Populate all 5 filter dropdowns from the loaded course list

function initializeFilterMenus(records) {
  buildOptionList(
    filterDepartment,
    records.map(function (course) {
      return course.department;
    })
  );
  buildOptionList(
    filterLevel,
    records.map(function (course) {
      return course.level;
    }),
    true
  );
  buildOptionList(
    filterCredits,
    records.map(function (course) {
      return course.credits;
    }),
    true
  );
  buildOptionList(
    filterInstructor,
    records.map(function (course) {
      return course.instructor;
    })
  );
  buildOptionList(
    filterSemester,
    records.map(function (course) {
      return course.semester;
    })
  );
}

// Reset all filter dropdowns back to "All" and refresh the course list

function clearAllFilters() {
  filterDepartment.value = "All";
  filterLevel.value = "All";
  filterCredits.value = "All";
  filterInstructor.value = "All";
  filterSemester.value = "All";
  syncCatalogDisplay();
}

// ------------------------------------------
// Filtering, Sorting & Rendering
// ------------------------------------------

// Return courses matching all currently selected filter dropdowns

function extractMatchingCourses(records) {
  const activeDept = filterDepartment.value;
  const activeLevel = filterLevel.value;
  const activeCredits = filterCredits.value;
  const activeInstructor = filterInstructor.value;
  const activeSemester = filterSemester.value;

  return records.filter(function (course) {
    const deptOk = activeDept === "All" || course.department === activeDept;
    const levelOk = activeLevel === "All" || String(course.level) === activeLevel;
    const creditsOk = activeCredits === "All" || String(course.credits) === activeCredits;
    const instructorOk =
      activeInstructor === "All" || course.instructor === activeInstructor;
    const semesterOk = activeSemester === "All" || course.semester === activeSemester;

    return deptOk && levelOk && creditsOk && instructorOk && semesterOk;
  });
}

// Sort a shallow copy of the filtered courses so "none" preserves the original JSON order

function arrangeCourses(records) {
  const chosenOrder = orderSelect.value;
  const workingCopy = [...records];

  if (chosenOrder === "none") {
    return workingCopy;
  }

  return workingCopy.sort(function (first, second) {
    if (chosenOrder === "id-asc") return first.id.localeCompare(second.id);
    if (chosenOrder === "id-desc") return second.id.localeCompare(first.id);
    if (chosenOrder === "title-asc") return first.title.localeCompare(second.title);
    if (chosenOrder === "title-desc") return second.title.localeCompare(first.title);

    if (chosenOrder === "semester-asc" || chosenOrder === "semester-desc") {
      const scoreFirst = first.computeTermChronology();
      const scoreSecond = second.computeTermChronology();

      // Push missing/invalid semesters to the bottom regardless of sort direction

      if (scoreFirst === null && scoreSecond === null) return 0;
      if (scoreFirst === null) return 1;
      if (scoreSecond === null) return -1;

      return chosenOrder === "semester-asc"
        ? scoreFirst - scoreSecond
        : scoreSecond - scoreFirst;
    }

    return 0;
  });
}

// Render clickable course code cards in the left sidebar

function renderCodeSidebar(records) {
  courseColumn.innerHTML = "";

  if (records.length === 0) {
    courseColumn.innerHTML = '<p class="muted-hint">No courses match the selected filters.</p>';
    return;
  }

  records.forEach(function (course) {
    const pill = document.createElement("div");
    pill.className = "course-pill";
    pill.textContent = course.id;
    pill.title = course.buildPlainSummary();

    if (course.id === selectedCode) {
      pill.classList.add("is-selected");
    }

    pill.addEventListener("click", function () {
      selectedCode = course.id;
      course.
