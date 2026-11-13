import React from 'react';
import { getStorageObjectPath, resolveFileUrl } from '../../supabase/storage';
import { useToast } from '../../context/ToastContext';
import { safeHttpUrl } from '../../utils/safeHttpUrl';

interface FileLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  fileRef: string;
}

export const FileLink: React.FC<FileLinkProps> = ({ fileRef, onClick, children, ...props }) => {
  const { toast } = useToast();
  const isPrivateFile = Boolean(getStorageObjectPath(fileRef));
  const safeUrl = isPrivateFile ? null : safeHttpUrl(fileRef);
  if (!isPrivateFile && !safeUrl) return null;

  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = async event => {
    onClick?.(event);
    if (event.defaultPrevented || !isPrivateFile) return;
    event.preventDefault();

    const popup = window.open('about:blank', '_blank');
    if (!popup) {
      toast({ type: 'error', message: 'Your browser blocked the file preview. Allow pop-ups and try again.' });
      return;
    }
    popup.opener = null;
    try {
      const url = await resolveFileUrl(fileRef);
      if (!url) throw new Error('The file link is invalid.');
      popup.location.replace(url);
    } catch (error) {
      popup.close();
      toast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to open the file.',
      });
    }
  };

  const href = isPrivateFile ? '#' : safeUrl!;
  return (
    <a
      {...props}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
    >
      {children}
    </a>
  );
};
