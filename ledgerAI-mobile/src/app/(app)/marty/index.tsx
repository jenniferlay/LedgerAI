import React, { useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, spacing } from '@/constants/theme';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatWelcome from '@/components/chat/ChatWelcome';
import ChatMessageBubble from '@/components/chat/ChatMessageBubble';
import ChatInputBar from '@/components/chat/ChatInputBar';
import TypingIndicator from '@/components/chat/TypingIndicator';
import { useChat } from '@/hooks/use-chat';
import type { ChatMessage } from '@/components/chat/types';

export default function MartyChatScreen() {
  const {
    messages,
    isGenerating,
    sendMessage,
    retryMessage,
    clearMessages,
    handleAction,
  } = useChat();

  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages.length, isGenerating]);

  return (
    <View style={styles.screen}>
      <ChatHeader onClearChat={clearMessages} messageCount={messages.length} />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {messages.length === 0 ? (
          <FlatList
            data={[]}
            renderItem={() => null}
            ListEmptyComponent={<ChatWelcome onSelectPrompt={sendMessage} />}
            contentContainerStyle={styles.emptyScroll}
            keyboardShouldPersistTaps="handled"
          />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChatMessageBubble
                message={item}
                onRetry={retryMessage}
                onSelectAction={handleAction}
              />
            )}
            ListFooterComponent={isGenerating ? <TypingIndicator /> : null}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }}
          />
        )}

        <ChatInputBar onSend={sendMessage} disabled={isGenerating} />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  keyboardContainer: {
    flex: 1,
  },
  emptyScroll: {
    flexGrow: 1,
  },
  listContent: {
    paddingVertical: spacing.md,
    gap: 2,
  },
});
