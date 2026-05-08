'use strict';

const { getMainTemplateById, batchGetObjectTemplates } = require('./template.service');
const logger = require('../utils/logger');

const MAX_PROMPT_LENGTH = 1000;

/**
 * Builds the final AI prompt by concatenating main template and object templates.
 * @param {string} mainTemplateId - ID of the main template
 * @param {string[]} objectTemplateIds - Array of object template IDs (optional)
 * @returns {Promise<{finalPrompt: string, truncated: boolean, objectsUsed: string[], mainTemplateId: string}>}
 */
const buildPrompt = async (mainTemplateId, objectTemplateIds = []) => {
  // STEP 1: FETCH
  const mainTemplate = await getMainTemplateById(mainTemplateId);
  const objectTemplates = await batchGetObjectTemplates(objectTemplateIds);

  // STEP 2: SORT OBJECTS by promptWeight descending
  const sortedObjects = [...objectTemplates].sort(
    (a, b) => (b.promptWeight || 0) - (a.promptWeight || 0),
  );

  // STEP 3: BUILD OBJECT CLAUSE
  let objectClause = '';
  if (sortedObjects.length > 0) {
    const parts = sortedObjects.map((obj, idx) => {
      const connector = idx === 0 ? ', featuring ' : ', alongside ';
      return `${connector}${obj.promptText}`;
    });
    objectClause = parts.join('');
  }

  // STEP 4: ASSEMBLE FINAL PROMPT
  const styleModifiers = mainTemplate.styleModifiers || [];
  const styleStr = styleModifiers.length > 0 ? `, ${styleModifiers.join(', ')}` : '';

  let finalPrompt = `${mainTemplate.promptText}${objectClause}, high quality, professional digital art${styleStr}`;

  let truncated = false;
  const objectsUsed = sortedObjects.map((o) => o.objectId);

  // Truncate if over 1000 chars by removing objects from lowest weight first
  if (finalPrompt.length > MAX_PROMPT_LENGTH) {
    logger.warn({ message: 'Prompt exceeds 1000 chars, truncating', length: finalPrompt.length, mainTemplateId });
    truncated = true;

    // Remove objects from the end (lowest weight = last after sort)
    const remainingObjects = [...sortedObjects];
    while (remainingObjects.length > 0) {
      remainingObjects.pop(); // remove lowest weight (last)

      let newObjectClause = '';
      if (remainingObjects.length > 0) {
        const parts = remainingObjects.map((obj, idx) => {
          const connector = idx === 0 ? ', featuring ' : ', alongside ';
          return `${connector}${obj.promptText}`;
        });
        newObjectClause = parts.join('');
      }

      const newStyleStr = styleModifiers.length > 0 ? `, ${styleModifiers.join(', ')}` : '';
      finalPrompt = `${mainTemplate.promptText}${newObjectClause}, high quality, professional digital art${newStyleStr}`;

      if (finalPrompt.length <= MAX_PROMPT_LENGTH) break;
    }

    // If still too long even with no objects, truncate at limit
    if (finalPrompt.length > MAX_PROMPT_LENGTH) {
      finalPrompt = finalPrompt.substring(0, MAX_PROMPT_LENGTH);
    }
  }

  return {
    finalPrompt,
    truncated,
    objectsUsed,
    mainTemplateId,
  };
};

module.exports = { buildPrompt };
