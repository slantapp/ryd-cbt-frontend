import { resolveQuestionImageUrl } from '../utils/questionImage';

type QuestionImageProps = {
  imageUrl?: string | null;
  alt?: string;
  className?: string;
};

export default function QuestionImage({ imageUrl, alt = 'Question illustration', className }: QuestionImageProps) {
  const src = resolveQuestionImageUrl(imageUrl);
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      className={className ?? 'max-w-full h-auto rounded-lg border border-gray-200 mb-4'}
      loading="lazy"
    />
  );
}
