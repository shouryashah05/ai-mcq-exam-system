const shuffleArray = (array = []) => {
  const shuffled = [...array];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
};

const buildShuffledOptionData = (question) => {
  const options = Array.isArray(question?.options) ? question.options : [];
  const optionOrder = shuffleArray(options.map((_, index) => index));
  const shuffledOptions = optionOrder.map((index) => options[index]);
  const correctOptionIndex = optionOrder.indexOf(question?.correctAnswer);

  return {
    shuffledOptions,
    optionOrder,
    correctOptionIndex,
  };
};

const buildPresentedQuestion = (question, answer) => {
  if (!question || typeof question !== 'object') {
    return question;
  }

  return {
    ...question,
    options: Array.isArray(answer?.shuffledOptions) && answer.shuffledOptions.length
      ? answer.shuffledOptions
      : question.options,
  };
};

const serializeAttemptForClient = (attempt) => {
  const plainAttempt = attempt?.toObject ? attempt.toObject() : attempt;
  if (!plainAttempt) {
    return plainAttempt;
  }

  return {
    ...plainAttempt,
    answers: Array.isArray(plainAttempt.answers)
      ? plainAttempt.answers.map((answer) => {
        const { shuffledOptions, optionOrder, correctOptionIndex, ...rest } = answer;
        return {
          ...rest,
          questionId: answer?.questionId && typeof answer.questionId === 'object' && !Array.isArray(answer.questionId)
            ? buildPresentedQuestion(answer.questionId, answer)
            : answer.questionId,
        };
      })
      : [],
  };
};

module.exports = {
  buildPresentedQuestion,
  buildShuffledOptionData,
  serializeAttemptForClient,
  shuffleArray,
};