import { Button, Separator, YStack } from 'tamagui';
import { Eye, Pencil } from '@tamagui/lucide-icons';
import { useState } from 'react';
import { Textarea } from './Textarea';
import { Markdown } from '../Markdown';
import { FieldWatch } from './FieldWatch';
import { useFormContext } from 'react-hook-form';

export type MarkdownEditorProps = {
  name?: string;
  defaultMode?: 'edit' | 'preview';
};

export const MarkdownEditor = (props: MarkdownEditorProps) => {
  const [isEdit, setIsEdit] = useState(props.defaultMode === 'edit');

  const onEditPress = () => {
    setIsEdit((prev) => !prev);
  };

  const form = useFormContext();

  return (
    <YStack gap="$3">
      <Button
        onPress={onEditPress}
        icon={isEdit ? Eye : Pencil}
        alignSelf="flex-start"
      />
      <Separator />
      {isEdit ? (
        <Textarea name={props.name} />
      ) : (
        <FieldWatch control={form.control} name={['description']}>
          {([description]) => <Markdown content={description} />}
        </FieldWatch>
      )}
    </YStack>
  );
};
