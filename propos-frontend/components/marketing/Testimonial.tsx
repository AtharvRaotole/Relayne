interface TestimonialProps {
  quote: string;
  author: string;
  role: string;
}

export function Testimonial({ quote, author, role }: TestimonialProps) {
  return (
    <blockquote className="mt-16 max-w-2xl mx-auto text-center">
      <p className="text-lg text-gray-700 italic leading-relaxed">"{quote}"</p>
      <footer className="mt-4">
        <cite className="not-italic">
          <span className="font-semibold text-gray-900">{author}</span>
          <span className="text-gray-500">, {role}</span>
        </cite>
      </footer>
    </blockquote>
  );
}
