export function GradientMesh() {
  return (
    <div className="absolute inset-x-0 top-0 h-[40vh] min-h-[400px] w-full overflow-hidden pointer-events-none z-0">
      {/* 
        Stripi Gradient Mesh Backdrop 
        - Cream, Sherbet Orange, Lavender, Indigo, Ruby Pink
        - Organic blobs blurred horizontally
      */}
      <div className="absolute inset-0 opacity-80 mix-blend-multiply filter blur-[80px]">
        {/* Cream base */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[60%] rounded-full bg-canvas-cream" />
        {/* Lemon / Orange */}
        <div className="absolute top-[10%] left-[20%] w-[40%] h-[50%] rounded-full bg-lemon opacity-30" />
        {/* Lavender / Soft Indigo */}
        <div className="absolute top-[-5%] left-[40%] w-[45%] h-[60%] rounded-full bg-primary-subdued opacity-60" />
        {/* Primary Indigo */}
        <div className="absolute top-[5%] right-[10%] w-[35%] h-[70%] rounded-full bg-primary opacity-50" />
        {/* Ruby Pink */}
        <div className="absolute top-[20%] right-[-5%] w-[30%] h-[50%] rounded-full bg-ruby opacity-40" />
        {/* Magenta */}
        <div className="absolute top-[15%] right-[25%] w-[20%] h-[40%] rounded-full bg-magenta opacity-30" />
      </div>
      {/* White fade out at the bottom */}
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-canvas to-transparent" />
    </div>
  );
}
