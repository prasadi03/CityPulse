import React from 'react';
import { useNagaraAI } from '../../hooks/useNagaraAI';
import type { UserSession } from '../../types/citypulse';
import { FloatingButton } from './FloatingButton';
import { ChatPanel } from './ChatPanel';

interface NagaraAIWidgetProps {
  session: UserSession;
}

export const NagaraAIWidget: React.FC<NagaraAIWidgetProps> = ({ session }) => {
  const nagara = useNagaraAI(session);

  return (
    <>
      <FloatingButton
        isOpen={nagara.isOpen}
        unreadCount={nagara.unreadCount}
        onClick={nagara.openPanel}
      />
      <ChatPanel
        isOpen={nagara.isOpen}
        session={session}
        updatesFeed={nagara.updatesFeed}
        newHighlightIds={nagara.newHighlightIds}
        messages={nagara.messages}
        pendingApproval={nagara.pendingApproval}
        askBeforeExternalTools={nagara.askBeforeExternalTools}
        isLoading={nagara.isLoading}
        isOffline={nagara.isOffline}
        connectionStatus={nagara.connectionStatus}
        onTestConnection={nagara.testConnection}
        onClose={nagara.closePanel}
        onSend={nagara.sendMessage}
        onResolveApproval={nagara.resolveApproval}
        onToggleApprovalSetting={nagara.toggleAskBeforeExternalTools}
        onClearChat={nagara.clearChat}
      />
    </>
  );
};

export { FloatingButton } from './FloatingButton';
export { ChatPanel } from './ChatPanel';
export { UpdatesDigest } from './UpdatesDigest';
export { MessageBubble } from './MessageBubble';
export { ToolApprovalCard } from './ToolApprovalCard';
