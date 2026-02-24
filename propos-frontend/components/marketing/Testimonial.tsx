interface TestimonialProps {
  quote: string;
  author: string;
  role: string;
  dark?: boolean;
}

export function Testimonial({ quote, author, role }: TestimonialProps) {
  return (
    <blockquote className="mt-16 max-w-2xl mx-auto text-center">
      <div className="mb-4 flex justify-center">
        <div className="h-px w-12 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
      </div>
      <p className="text-lg italic leading-relaxed text-zinc-300">&ldquo;{quote}&rdquo;</p>
      <footer className="mt-5">
        <cite className="not-italic">
          <span className="font-semibold text-white">{author}</span>
          <span className="text-zinc-500">, {role}</span>
        </cite>
      </footer>
    </blockquote>
  );
}
