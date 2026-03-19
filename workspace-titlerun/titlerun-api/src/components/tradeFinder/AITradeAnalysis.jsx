/**
 * AITradeAnalysis Component
 *
 * Renders a 5-part AI-generated trade narrative.
 * Sections: For Trading Away, For Receiving, Against Trading Away,
 *           Against Receiving, Consensus.
 *
 * Used inside Trade Finder results to provide deep, data-driven
 * analysis for each trade recommendation.
 */
import React, { useState } from 'react';

const AITradeAnalysis = ({ analysis, giveName, getName, isLoading = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Loading state
  if (isLoading) {
    return (
      <div className="mt-4 p-4 bg-dark-800 rounded-lg animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 bg-blue-500/30 rounded-full animate-ping" />
          <span className="text-xs text-gray-500">Generating analysis...</span>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-dark-700 rounded w-3/4" />
          <div className="h-3 bg-dark-700 rounded w-5/6" />
          <div className="h-3 bg-dark-700 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const {
    forTradingAway,
    forReceiving,
    againstTradingAway,
    againstReceiving,
    consensus,
    generatedDate,
  } = analysis;

  // Collapsed view shows just the consensus
  if (!isExpanded) {
    return (
      <div className="mt-3 p-3 bg-dark-800 rounded-lg">
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full text-left group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-blue-400 uppercase tracking-wide">
              ⚖️ AI Analysis
            </span>
            <span className="text-xs text-gray-600 group-hover:text-gray-400 transition-colors">
              Expand ▼
            </span>
          </div>
          {consensus && (
            <p className="text-sm text-gray-300 leading-relaxed line-clamp-2">
              {consensus}
            </p>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-dark-800 rounded-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wide">
          Trade Analysis
        </h4>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          Collapse ▲
        </button>
      </div>

      {/* For Trading Away */}
      {forTradingAway && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-emerald-400">
              ✓ FOR TRADING AWAY{giveName ? ` ${giveName.toUpperCase()}` : ''}
            </span>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{forTradingAway}</p>
        </div>
      )}

      {/* For Receiving */}
      {forReceiving && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-emerald-400">
              ✓ FOR RECEIVING{getName ? ` ${getName.toUpperCase()}` : ''}
            </span>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{forReceiving}</p>
        </div>
      )}

      {/* Against Trading Away */}
      {againstTradingAway && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-rose-400">
              ✗ AGAINST TRADING AWAY{giveName ? ` ${giveName.toUpperCase()}` : ''}
            </span>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{againstTradingAway}</p>
        </div>
      )}

      {/* Against Receiving */}
      {againstReceiving && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-rose-400">
              ✗ AGAINST RECEIVING{getName ? ` ${getName.toUpperCase()}` : ''}
            </span>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{againstReceiving}</p>
        </div>
      )}

      {/* Consensus */}
      {consensus && (
        <div className="pt-3 border-t border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-blue-400">⚖️ CONSENSUS</span>
          </div>
          <p className="text-sm text-gray-100 font-medium leading-relaxed">{consensus}</p>
        </div>
      )}

      {/* Updated date */}
      {generatedDate && (
        <p className="text-xs text-gray-600 text-right">
          Analysis updated {generatedDate}
        </p>
      )}
    </div>
  );
};

export default AITradeAnalysis;
