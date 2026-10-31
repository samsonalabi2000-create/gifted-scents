import { useId } from 'react';

/**
 * Lightweight animated treatment for the existing Gifted Scents artwork.
 * The original image remains intact; CSS adds a restrained mist, particles,
 * and shimmer without redrawing or replacing the brand mark.
 */
export function AnimatedBrandLogo({ src, alt, animate = true, className = '' }) {
  const id = useId();

  return (
    <div className={`gs-logo-stage ${animate ? 'gs-logo-stage--animated' : ''} ${className}`}>
      <img
        src={src}
        alt={alt}
        width="900"
        height="900"
        fetchPriority="high"
        decoding="async"
        className="gs-logo-stage__image"
      />
      {animate && (
        <span className="gs-logo-effects" aria-hidden="true" id={`gs-logo-effects-${id.replace(/:/g, '')}`}>
          <span className="gs-logo-mist gs-logo-mist--one" />
          <span className="gs-logo-mist gs-logo-mist--two" />
          <span className="gs-logo-particle gs-logo-particle--one" />
          <span className="gs-logo-particle gs-logo-particle--two" />
          <span className="gs-logo-particle gs-logo-particle--three" />
          <span className="gs-logo-particle gs-logo-particle--four" />
          <span className="gs-logo-particle gs-logo-particle--five" />
          <span className="gs-logo-shimmer" />
        </span>
      )}
    </div>
  );
}
