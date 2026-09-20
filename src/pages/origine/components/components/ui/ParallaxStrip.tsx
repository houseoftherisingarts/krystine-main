import React from 'react';

interface ParallaxStripProps {
  imageUrl: string;
  altText: string;
  alignment?: string; // Prop to handle specific offsets
  /** Clé de la surcharge du crayon, propre à cet emplacement : la même image
   *  sert ailleurs sur le site et ne doit pas changer partout d'un coup. */
  editKey?: string;
}

export const ParallaxStrip: React.FC<ParallaxStripProps> = ({
  imageUrl,
  altText,
  alignment = "bg-center",
  editKey,
}) => {
  return (
    <div
      /* Fix: bg-scroll for mobile (prevents zoom blob) and md:bg-fixed for desktop parallax */
      className={`relative h-[50vh] md:h-[75vh] lg:h-[85vh] w-full bg-cover ${alignment} lg:bg-center bg-no-repeat bg-scroll md:bg-fixed bg-ink-sureau dark:bg-black/80 transition-colors duration-700`}
      data-edit-key={editKey}
      style={{ backgroundImage: `url('${imageUrl}')` }}
      aria-label={altText}
    >
      <div className="absolute inset-0 bg-black/10 dark:bg-black/40 pointer-events-none"></div>
    </div>
  );
};
