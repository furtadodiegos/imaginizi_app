import { SendHorizontal } from 'lucide-react';
import { FC, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLegend, FieldSet } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type CameraFormProps = {
  onSubmit: (prompt: string) => void;
};

export const CameraForm: FC<CameraFormProps> = ({ onSubmit }) => {
  const [prompt, setPrompt] = useState('');

  return (
    <form
      className="w-full max-w-md mx-4 p-2 pb-8"
      onSubmit={(e) => {
        e.preventDefault();

        onSubmit(prompt);
      }}>
      <FieldGroup>
        <FieldSet>
          <FieldLegend className="text-start text-lg font-bold text-white">Nice Picture</FieldLegend>

          <FieldDescription className="text-start text-sm font-bold text-white/50">
            {`Now, let's transform the person in the photo!`}
          </FieldDescription>

          <Field>
            <div className="input-border-animation">
              <Textarea
                id="prompt"
                className={cn(
                  'text-start text-base md:text-sm font-bold text-white/90 relative z-10 border-none focus-visible:border-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none min-h-[36px]',
                )}
                placeholder={`I want to be Buzz Lightyear from Toy Story 4`}
                required
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={1}
              />
              <span className="border-line border-bottom" />
            </div>
          </Field>

          <Button
            type="submit"
            className="rounded-full absolute right-6 bottom-[33px] bg-transparent z-10"
            disabled={!prompt}>
            <SendHorizontal className={cn('size-6 text-white/50', prompt && 'animate-pulse text-primary')} />
          </Button>
        </FieldSet>
      </FieldGroup>
    </form>
  );
};
