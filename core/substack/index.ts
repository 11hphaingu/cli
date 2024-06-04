/**
 * @module substack-harvestor
 *
 * This module provides functionality for harvesting content (articles, audio) from Substack publications. It features:
 * - Authentication (login)
 * - Content retrieval (articles, audio)
 * - Processing and saving harvested content (PDF, audio files)
 * - Marking processed articles
 *
 * The module is designed with functional programming principles, using fp-ts for composition and error handling.
 */

// ... (your existing type definitions: CheckIfCatchedAlready, Login, Post, etc.)

export * as harvester from "./harvester.base";
