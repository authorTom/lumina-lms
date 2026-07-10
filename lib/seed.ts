import type { Database } from "better-sqlite3";
import bcrypt from "bcryptjs";

export function seed(db: Database) {
  const hash = bcrypt.hashSync("password123", 10);

  const insertUser = db.prepare(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)"
  );
  const adminId = insertUser.run("Alex Morgan", "admin@lms.dev", hash, "admin")
    .lastInsertRowid as number;
  const sarahId = insertUser.run("Sarah Chen", "sarah@lms.dev", hash, "instructor")
    .lastInsertRowid as number;
  const jamesId = insertUser.run("James Okafor", "james@lms.dev", hash, "instructor")
    .lastInsertRowid as number;
  const studentId = insertUser.run("Tom Wright", "student@lms.dev", hash, "student")
    .lastInsertRowid as number;
  insertUser.run("Priya Patel", "priya@lms.dev", hash, "student");
  insertUser.run("Marcus Lee", "marcus@lms.dev", hash, "student");
  void adminId;

  const insertCourse = db.prepare(
    "INSERT INTO courses (title, description, category, level, color, instructor_id, published) VALUES (?, ?, ?, ?, ?, ?, 1)"
  );
  const insertModule = db.prepare(
    "INSERT INTO modules (course_id, title, position) VALUES (?, ?, ?)"
  );
  const insertLesson = db.prepare(
    "INSERT INTO lessons (module_id, title, content, video_url, duration_minutes, position) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insertQuiz = db.prepare(
    "INSERT INTO quizzes (module_id, title, pass_pct) VALUES (?, ?, 70)"
  );
  const insertQuestion = db.prepare(
    "INSERT INTO questions (quiz_id, text, position) VALUES (?, ?, ?)"
  );
  const insertChoice = db.prepare(
    "INSERT INTO choices (question_id, text, is_correct, position) VALUES (?, ?, ?, ?)"
  );

  type QuizSpec = { title: string; questions: [string, string[], number][] };
  type LessonSpec = { title: string; content: string; video?: string; minutes?: number };
  type ModuleSpec = { title: string; lessons: LessonSpec[]; quiz?: QuizSpec };

  function addCourse(
    title: string,
    description: string,
    category: string,
    level: string,
    color: string,
    instructorId: number,
    moduleSpecs: ModuleSpec[]
  ): number {
    const courseId = insertCourse.run(title, description, category, level, color, instructorId)
      .lastInsertRowid as number;
    moduleSpecs.forEach((mod, mi) => {
      const moduleId = insertModule.run(courseId, mod.title, mi).lastInsertRowid as number;
      mod.lessons.forEach((lesson, li) => {
        insertLesson.run(
          moduleId,
          lesson.title,
          lesson.content,
          lesson.video ?? null,
          lesson.minutes ?? 8,
          li
        );
      });
      if (mod.quiz) {
        const quizId = insertQuiz.run(moduleId, mod.quiz.title).lastInsertRowid as number;
        mod.quiz.questions.forEach(([text, choices, correct], qi) => {
          const questionId = insertQuestion.run(quizId, text, qi).lastInsertRowid as number;
          choices.forEach((choice, ci) => {
            insertChoice.run(questionId, choice, ci === correct ? 1 : 0, ci);
          });
        });
      }
    });
    return courseId;
  }

  const tsCourse = addCourse(
    "TypeScript Fundamentals",
    "Learn TypeScript from the ground up: the type system, interfaces, generics, and how to migrate real JavaScript projects with confidence.",
    "Programming",
    "Beginner",
    "indigo",
    sarahId,
    [
      {
        title: "Getting Started",
        lessons: [
          {
            title: "Why TypeScript?",
            minutes: 6,
            content: `## The case for types

JavaScript is dynamically typed, which makes it quick to start with but risky to scale. TypeScript adds a **static type system** on top of JavaScript that catches whole classes of bugs before your code ever runs.

Consider this JavaScript function:

\`\`\`
function total(items) {
  return items.reduce((sum, i) => sum + i.price, 0);
}
\`\`\`

If someone passes a single item instead of an array, you find out at runtime — possibly in production. With TypeScript, the compiler flags it immediately.

## What you'll learn

- How the type system models your data
- Interfaces, unions, and generics
- Configuring the compiler for real projects
- Migrating existing JavaScript incrementally`,
          },
          {
            title: "Setting Up Your Environment",
            minutes: 10,
            content: `## Installing TypeScript

Install the compiler as a dev dependency in your project:

\`\`\`
npm install --save-dev typescript
npx tsc --init
\`\`\`

The \`tsc --init\` command generates a \`tsconfig.json\` file — the control panel for the compiler.

## Key compiler options

- **strict** — turns on all strict checking. Always enable this for new projects.
- **target** — which JavaScript version to emit. \`ES2022\` is a safe modern default.
- **module** — the module system. Use \`esnext\` or \`nodenext\` depending on your runtime.

## Editor support

VS Code ships with TypeScript support built in. Hover over any variable to see its inferred type, and use *Go to Definition* to jump through your codebase.`,
          },
          {
            title: "Your First Typed Program",
            minutes: 12,
            content: `## Type annotations

Annotations attach a type to a variable, parameter, or return value:

\`\`\`
function greet(name: string): string {
  return "Hello, " + name;
}

const count: number = 42;
const active: boolean = true;
\`\`\`

## Inference does the heavy lifting

You rarely need to annotate everything. TypeScript infers types from usage:

\`\`\`
const scores = [90, 85, 77];   // number[]
const first = scores[0];        // number
\`\`\`

**Rule of thumb:** annotate function boundaries (parameters and return types), let inference handle local variables.`,
          },
        ],
        quiz: {
          title: "Getting Started Check",
          questions: [
            [
              "What is the main benefit of TypeScript over JavaScript?",
              [
                "It runs faster in the browser",
                "It catches type errors before code runs",
                "It requires less code",
                "It replaces the need for testing",
              ],
              1,
            ],
            [
              "Which command generates a tsconfig.json file?",
              ["npm init", "npx tsc --init", "npm run build", "npx typescript new"],
              1,
            ],
            [
              "Where should you prioritize adding type annotations?",
              [
                "Every variable declaration",
                "Only in test files",
                "Function parameters and return types",
                "Nowhere — inference handles everything",
              ],
              2,
            ],
          ],
        },
      },
      {
        title: "The Type System",
        lessons: [
          {
            title: "Interfaces and Object Types",
            minutes: 14,
            content: `## Describing object shapes

Interfaces describe the shape of an object:

\`\`\`
interface User {
  id: number;
  name: string;
  email?: string;      // optional
  readonly role: string; // cannot be reassigned
}
\`\`\`

## Extending interfaces

Interfaces can build on each other:

\`\`\`
interface Instructor extends User {
  courses: string[];
}
\`\`\`

## Interface vs type alias

Both can describe objects. Use **interface** for object shapes that may be extended, and **type** for unions, intersections, and everything else. Consistency within a codebase matters more than the choice itself.`,
          },
          {
            title: "Union Types and Narrowing",
            minutes: 12,
            content: `## Unions model "either/or"

\`\`\`
type Status = "draft" | "published" | "archived";

function label(status: Status): string {
  switch (status) {
    case "draft": return "Draft";
    case "published": return "Live";
    case "archived": return "Archived";
  }
}
\`\`\`

The compiler knows every case is handled — add a new status and every unhandled switch becomes an error.

## Narrowing

TypeScript narrows a union as you check it:

\`\`\`
function format(value: string | number) {
  if (typeof value === "string") {
    return value.toUpperCase(); // value is string here
  }
  return value.toFixed(2);      // value is number here
}
\`\`\``,
          },
          {
            title: "Generics",
            minutes: 15,
            content: `## Writing reusable typed code

Generics let a function or type work over many types while staying type-safe:

\`\`\`
function first<T>(items: T[]): T | undefined {
  return items[0];
}

const n = first([1, 2, 3]);        // number | undefined
const s = first(["a", "b"]);       // string | undefined
\`\`\`

## Constraints

Use \`extends\` to require capabilities:

\`\`\`
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}
\`\`\`

**Guideline:** reach for generics when a type flows from input to output. If a type parameter is used only once, you probably don't need it.`,
          },
        ],
        quiz: {
          title: "Type System Check",
          questions: [
            [
              "How do you mark an interface property as optional?",
              ["With a ! suffix", "With a ? suffix", "With the optional keyword", "By assigning null"],
              1,
            ],
            [
              'What does TypeScript do inside an `if (typeof x === "string")` block?',
              [
                "Throws if x is not a string",
                "Converts x to a string",
                "Narrows the type of x to string",
                "Nothing — typeof is runtime only",
              ],
              2,
            ],
            [
              "When is a generic type parameter most useful?",
              [
                "When a type flows from input to output",
                "When you want to skip type checking",
                "Only in class definitions",
                "When working with strings",
              ],
              0,
            ],
          ],
        },
      },
    ]
  );

  const reactCourse = addCourse(
    "React for Modern Web Apps",
    "Build interactive user interfaces with React: components, hooks, state management, and data fetching patterns used in production apps.",
    "Programming",
    "Intermediate",
    "sky",
    sarahId,
    [
      {
        title: "Components and Props",
        lessons: [
          {
            title: "Thinking in Components",
            minutes: 9,
            content: `## UI as a tree of components

React apps are built from **components** — functions that take props and return UI:

\`\`\`
function CourseCard({ title, level }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <span>{level}</span>
    </div>
  );
}
\`\`\`

## Composition over configuration

Small, focused components compose into complex screens. When a component grows past ~150 lines or handles unrelated concerns, split it.

- **Presentational** components render data they're given
- **Container** components fetch data and manage state`,
          },
          {
            title: "State with useState",
            minutes: 11,
            content: `## Local state

The \`useState\` hook gives a component memory between renders:

\`\`\`
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  );
}
\`\`\`

## State updates are asynchronous

React batches updates. When new state depends on old state, pass a function:

\`\`\`
setCount(prev => prev + 1);
\`\`\`

## Lifting state up

When two components need the same state, move it to their closest common parent and pass it down as props.`,
          },
          {
            title: "Effects and Data Fetching",
            minutes: 13,
            content: `## Synchronizing with the outside world

\`useEffect\` runs code after render — subscriptions, timers, manual DOM work:

\`\`\`
useEffect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id); // cleanup
}, []);
\`\`\`

## The dependency array

- \`[]\` — run once after mount
- \`[value]\` — run when value changes
- omitted — run after every render (rarely what you want)

## Data fetching

In modern React, prefer framework-level data loading (server components, loaders) or a library like React Query over hand-rolled \`useEffect\` fetching — they handle caching, races, and revalidation for you.`,
          },
        ],
        quiz: {
          title: "Components Check",
          questions: [
            [
              "When new state depends on the previous state, you should:",
              [
                "Read state directly and add to it",
                "Pass an updater function to the setter",
                "Use a global variable",
                "Force a re-render first",
              ],
              1,
            ],
            [
              "What does an empty dependency array [] mean for useEffect?",
              [
                "The effect never runs",
                "The effect runs after every render",
                "The effect runs once after mount",
                "The effect runs before render",
              ],
              2,
            ],
          ],
        },
      },
      {
        title: "Patterns for Real Apps",
        lessons: [
          {
            title: "Forms and Controlled Inputs",
            minutes: 12,
            content: `## Controlled components

A controlled input's value lives in React state:

\`\`\`
const [email, setEmail] = useState("");

<input
  value={email}
  onChange={e => setEmail(e.target.value)}
/>
\`\`\`

Validation, formatting, and submission logic all read from one source of truth.

## When to use uncontrolled inputs

For large forms where you only need values on submit, uncontrolled inputs (reading from \`FormData\`) avoid re-rendering on every keystroke and pair well with server actions.`,
          },
          {
            title: "Context and Shared State",
            minutes: 10,
            content: `## Avoiding prop drilling

Context passes data through the tree without threading props at every level:

\`\`\`
const ThemeContext = createContext("light");

function App() {
  return (
    <ThemeContext value="dark">
      <Page />
    </ThemeContext>
  );
}

function Button() {
  const theme = useContext(ThemeContext);
  // ...
}
\`\`\`

## Use it sparingly

Context is for genuinely global concerns — theme, auth, locale. For frequently changing data, a dedicated state library or component composition usually performs better.`,
          },
        ],
        quiz: {
          title: "Patterns Check",
          questions: [
            [
              "In a controlled input, where does the current value live?",
              ["In the DOM", "In React state", "In localStorage", "In a ref"],
              1,
            ],
            [
              "Context is best suited for:",
              [
                "All component state",
                "High-frequency updates like keystrokes",
                "Global concerns like theme and auth",
                "Replacing all props",
              ],
              2,
            ],
          ],
        },
      },
    ]
  );

  addCourse(
    "SQL and Database Design",
    "Model data well and query it fast. Covers relational design, joins, aggregation, indexing, and the habits that keep production databases healthy.",
    "Data",
    "Beginner",
    "emerald",
    jamesId,
    [
      {
        title: "Relational Foundations",
        lessons: [
          {
            title: "Tables, Rows, and Keys",
            minutes: 8,
            content: `## The relational model

Data lives in **tables** of rows and columns. Every well-designed table has a **primary key** — a column (or set of columns) that uniquely identifies each row.

\`\`\`
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);
\`\`\`

## Foreign keys connect tables

A foreign key in one table references the primary key of another, expressing relationships:

\`\`\`
CREATE TABLE enrollments (
  user_id INTEGER REFERENCES users(id),
  course_id INTEGER REFERENCES courses(id)
);
\`\`\`

This is exactly how the LMS you're using right now stores who is enrolled in what.`,
          },
          {
            title: "SELECT, WHERE, and ORDER BY",
            minutes: 12,
            content: `## Reading data

\`\`\`
SELECT title, level
FROM courses
WHERE category = 'Programming'
ORDER BY title;
\`\`\`

- **SELECT** picks columns
- **WHERE** filters rows
- **ORDER BY** sorts results

## Filtering patterns

\`\`\`
WHERE level IN ('Beginner', 'Intermediate')
WHERE title LIKE '%SQL%'
WHERE created_at >= '2026-01-01'
\`\`\`

**Tip:** always develop queries with a \`LIMIT\` clause so a mistake doesn't scan millions of rows.`,
          },
          {
            title: "Joins",
            minutes: 15,
            content: `## Combining tables

Joins answer questions that span tables — "which students are enrolled in which courses?":

\`\`\`
SELECT u.name, c.title
FROM enrollments e
JOIN users u   ON u.id = e.user_id
JOIN courses c ON c.id = e.course_id;
\`\`\`

## Join types

- **INNER JOIN** — only rows with matches on both sides
- **LEFT JOIN** — all rows from the left table, matched or not
- **RIGHT / FULL** — less common; think in terms of LEFT joins

**Mental model:** start from the table whose rows you want to keep, then join outward.`,
          },
        ],
        quiz: {
          title: "Foundations Check",
          questions: [
            [
              "What does a primary key guarantee?",
              [
                "Rows are sorted",
                "Each row is uniquely identifiable",
                "The table is indexed on every column",
                "Values are integers",
              ],
              1,
            ],
            [
              "A LEFT JOIN returns:",
              [
                "Only matching rows from both tables",
                "All rows from the left table, with matches where they exist",
                "All rows from the right table",
                "The cartesian product",
              ],
              1,
            ],
            [
              "Which clause filters rows?",
              ["SELECT", "ORDER BY", "WHERE", "FROM"],
              2,
            ],
          ],
        },
      },
      {
        title: "Performance and Aggregation",
        lessons: [
          {
            title: "GROUP BY and Aggregates",
            minutes: 12,
            content: `## Summarizing data

Aggregate functions collapse many rows into summary values:

\`\`\`
SELECT category, COUNT(*) AS course_count, AVG(price) AS avg_price
FROM courses
GROUP BY category
HAVING COUNT(*) > 2;
\`\`\`

- **COUNT, SUM, AVG, MIN, MAX** — the core aggregates
- **GROUP BY** defines the buckets
- **HAVING** filters groups (WHERE filters rows *before* grouping)`,
          },
          {
            title: "Indexes",
            minutes: 14,
            content: `## Why queries get slow

Without an index, the database scans every row to answer a WHERE clause. An **index** is a sorted structure that lets it jump straight to matching rows.

\`\`\`
CREATE INDEX idx_enrollments_user ON enrollments(user_id);
\`\`\`

## What to index

- Columns used in WHERE clauses and JOIN conditions
- Foreign keys, almost always

## The cost

Every index slows down writes slightly and takes space. Index deliberately: measure with \`EXPLAIN\`, don't guess.`,
          },
        ],
        quiz: {
          title: "Performance Check",
          questions: [
            [
              "What is the difference between WHERE and HAVING?",
              [
                "They are interchangeable",
                "WHERE filters rows before grouping; HAVING filters groups after",
                "HAVING is faster",
                "WHERE only works with indexes",
              ],
              1,
            ],
            [
              "What is the downside of adding many indexes?",
              [
                "Reads become slower",
                "Writes become slower and storage grows",
                "Queries stop using WHERE",
                "There is no downside",
              ],
              1,
            ],
          ],
        },
      },
    ]
  );

  addCourse(
    "Product Design Essentials",
    "A practical introduction to UX and product design: research, wireframing, visual hierarchy, and communicating design decisions to a team.",
    "Design",
    "Beginner",
    "amber",
    jamesId,
    [
      {
        title: "Understanding Users",
        lessons: [
          {
            title: "Research Before Pixels",
            minutes: 9,
            content: `## Design starts with questions

The most expensive design mistake is building the wrong thing beautifully. Before opening a design tool, answer:

- **Who** is this for?
- **What** are they trying to accomplish?
- **Why** do current solutions fall short?

## Lightweight research methods

- **User interviews** — five conversations reveal most major issues
- **Support tickets and reviews** — free, honest feedback at scale
- **Watching people work** — what users do beats what they say

Write findings down as short, falsifiable statements: "Instructors abandon course setup because adding lessons takes too many clicks."`,
          },
          {
            title: "Wireframes and Flows",
            minutes: 11,
            content: `## Low fidelity, high speed

Wireframes are deliberately rough sketches of screens. Their job is to test **structure and flow** before anyone invests in visual polish.

## Map the flow first

A user flow lists every step from intent to outcome:

1. Student searches the catalog
2. Opens a course page
3. Enrolls
4. Lands in the first lesson

Each step is a screen or a decision. If the flow has more steps than the user's patience, fix that before styling anything.

## Tools don't matter much

Paper, whiteboards, or Figma — use whatever lets you throw work away without regret.`,
          },
        ],
        quiz: {
          title: "Research Check",
          questions: [
            [
              "What is the main purpose of a wireframe?",
              [
                "To finalize colors and typography",
                "To test structure and flow cheaply",
                "To present to investors",
                "To replace user research",
              ],
              1,
            ],
            [
              "Which signal is generally most reliable in research?",
              [
                "What users say they want",
                "What users do",
                "What competitors ship",
                "What stakeholders prefer",
              ],
              1,
            ],
          ],
        },
      },
      {
        title: "Visual Design",
        lessons: [
          {
            title: "Hierarchy and Layout",
            minutes: 12,
            content: `## Guiding the eye

Visual hierarchy tells users what matters most. You control it with:

- **Size** — bigger reads as more important
- **Weight** — bold beats regular
- **Color** — one accent color for primary actions
- **Space** — whitespace groups related things and separates unrelated ones

## The squint test

Squint at your screen until text blurs. Can you still tell what the primary action is? If everything looks equally loud, nothing is.

## Consistency

Reuse spacing values, type sizes, and colors from a small scale. A design system — even a tiny one — beats per-screen improvisation.`,
          },
          {
            title: "Typography Basics",
            minutes: 10,
            content: `## Type carries the interface

Most UI is text. Get these right and screens feel professional:

- **Scale** — pick 4–6 sizes and stick to them
- **Line height** — around 1.5 for body text, tighter for headings
- **Line length** — 45–75 characters per line for comfortable reading
- **Contrast** — body text should meet WCAG AA (4.5:1) against its background

## Pairing fonts

One typeface is enough for most products. If you pair two, give them clearly different jobs — one for headings, one for body — and don't add a third.`,
          },
        ],
        quiz: {
          title: "Visual Design Check",
          questions: [
            [
              "Which is NOT a primary tool for visual hierarchy?",
              ["Size", "Whitespace", "Color", "Animation speed"],
              3,
            ],
            [
              "A comfortable line length for body text is roughly:",
              ["10–20 characters", "45–75 characters", "100–150 characters", "As wide as the screen"],
              1,
            ],
          ],
        },
      },
    ]
  );

  // Enroll the demo student with some progress
  const enroll = db.prepare(
    "INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)"
  );
  enroll.run(studentId, tsCourse);
  enroll.run(studentId, reactCourse);

  const tsLessons = db
    .prepare(
      `SELECT l.id FROM lessons l JOIN modules m ON m.id = l.module_id
       WHERE m.course_id = ? ORDER BY m.position, l.position LIMIT 3`
    )
    .all(tsCourse) as { id: number }[];
  const markDone = db.prepare(
    "INSERT INTO lesson_progress (user_id, lesson_id) VALUES (?, ?)"
  );
  for (const lesson of tsLessons) markDone.run(studentId, lesson.id);
}
