 // --------------------------------------------------
// Helper
// --------------------------------------------------

function showLoading(element, message = "Thinking...") {

    element.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <span>${message}</span>
        </div>
    `;
}


// --------------------------------------------------
// Ask Question
// --------------------------------------------------

async function askQuestion() {

    const question =
        document.getElementById("question").value.trim();

    const subject =
        document.getElementById("subject").value;

    const level =
        document.getElementById("level").value;

    const answerSection =
        document.getElementById("answerSection");

    const answer =
        document.getElementById("answer");

    const button =
        document.getElementById("askButton");


    if (!question) {

        alert("Please enter your question.");

        return;
    }


    answerSection.classList.remove("hidden");

    button.disabled = true;

    showLoading(answer, "EduGenie is thinking...");


    try {

        const response = await fetch("/api/ask", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                question: question,

                subject: subject,

                level: level

            })

        });


        const data = await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.details || data.error || "Something went wrong."
            );

        }


        answer.textContent = data.answer;


    } catch (error) {

        answer.innerHTML =
            `❌ Error: ${escapeHtml(error.message)}`;

    } finally {

        button.disabled = false;

    }

}


// --------------------------------------------------
// Summarize
// --------------------------------------------------

async function summarizeText() {

    const text =
        document.getElementById("summaryText")
            .value.trim();

    const section =
        document.getElementById("summarySection");

    const result =
        document.getElementById("summaryResult");


    if (!text) {

        alert("Please paste some study material.");

        return;
    }


    section.classList.remove("hidden");

    showLoading(
        result,
        "Creating your summary..."
    );


    try {

        const response = await fetch(
            "/api/summarize",
            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    text: text
                })

            }
        );


        const data = await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.details || data.error || "Unable to summarize."
            );

        }


        result.textContent = data.summary;


    } catch (error) {

        result.innerHTML =
            `❌ Error: ${escapeHtml(error.message)}`;

    }

}


// --------------------------------------------------
// Generate Quiz
// --------------------------------------------------

async function generateQuiz() {

    const topic =
        document.getElementById("quizTopic")
            .value.trim();

    const number =
        Number(
            document.getElementById("quizNumber").value
        );

    const section =
        document.getElementById("quizSection");

    const result =
        document.getElementById("quizResult");


    if (!topic) {

        alert("Please enter a quiz topic.");

        return;
    }


    section.classList.remove("hidden");

    showLoading(
        result,
        "Generating your quiz..."
    );


    try {

        const response = await fetch(
            "/api/quiz",
            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    topic: topic,

                    number: number

                })

            }
        );


        const data = await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.details || data.error || "Unable to generate quiz."
            );

        }


        renderQuiz(data.quiz, result);


    } catch (error) {

        result.innerHTML =
            `❌ Error: ${escapeHtml(error.message)}`;

    }

}


function renderQuiz(questions, container) {

    container.replaceChildren();

    const score = document.createElement("p");
    score.className = "quiz-score";
    score.setAttribute("aria-live", "polite");
    container.appendChild(score);

    let answeredCount = 0;
    let correctCount = 0;

    function updateScore() {
        score.textContent = answeredCount === questions.length
            ? `Final score: ${correctCount} / ${questions.length}`
            : `Answered ${answeredCount} of ${questions.length} | Correct: ${correctCount}`;
    }

    updateScore();

    questions.forEach((item, questionIndex) => {
        const questionCard = document.createElement("article");
        questionCard.className = "quiz-question";

        const optionsGroup = document.createElement("fieldset");
        optionsGroup.className = "quiz-options";

        const questionText = document.createElement("legend");
        questionText.textContent = `${questionIndex + 1}. ${item.question}`;
        optionsGroup.appendChild(questionText);

        const feedback = document.createElement("p");
        feedback.className = "quiz-feedback hidden";
        feedback.setAttribute("role", "status");

        const optionInputs = [];

        item.options.forEach((option, optionIndex) => {
            const label = document.createElement("label");
            label.className = "quiz-option";

            const input = document.createElement("input");
            input.type = "radio";
            input.name = `quiz-question-${questionIndex}`;
            input.value = String(optionIndex);

            const letter = document.createElement("span");
            letter.className = "quiz-option-letter";
            letter.textContent = `${String.fromCharCode(65 + optionIndex)}.`;

            const optionText = document.createElement("span");
            optionText.className = "quiz-option-text";
            optionText.textContent = option;

            label.append(input, letter, optionText);
            optionsGroup.appendChild(label);
            optionInputs.push({ input, label });

            input.addEventListener("change", () => {
                const isCorrect = optionIndex === item.correctIndex;
                const correctLetter = String.fromCharCode(65 + item.correctIndex);

                answeredCount += 1;
                if (isCorrect) {
                    correctCount += 1;
                }

                optionInputs.forEach((optionItem, index) => {
                    optionItem.input.disabled = true;
                    if (index === item.correctIndex) {
                        optionItem.label.classList.add("correct");
                    } else if (index === optionIndex) {
                        optionItem.label.classList.add("incorrect");
                    }
                });

                feedback.className = `quiz-feedback ${isCorrect ? "correct" : "incorrect"}`;
                feedback.textContent = isCorrect
                    ? `Correct! ${item.explanation}`
                    : `Not quite. The correct answer is ${correctLetter}: ${item.options[item.correctIndex]}. ${item.explanation}`;

                updateScore();
            });
        });

        questionCard.append(optionsGroup, feedback);
        container.appendChild(questionCard);
    });
}


// --------------------------------------------------
// HTML escape helper
// --------------------------------------------------

function escapeHtml(text) {

    const div = document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}


// --------------------------------------------------
// Enter key shortcut
// --------------------------------------------------

document.addEventListener(
    "DOMContentLoaded",
    function () {

        const question =
            document.getElementById("question");

        question.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Enter" &&
                    event.ctrlKey
                ) {

                    askQuestion();

                }

            }
        );

    }
);