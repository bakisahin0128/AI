/* ==========================================================================
   DOSYA 1: src/features/ConversationManager.ts (YENİ DOSYA)
   
   SORUMLULUK: Tüm konuşma verilerini (oluşturma, kaydetme, yükleme,
   silme, aktif olanı takip etme) yönetir.
   ========================================================================== */

import * as vscode from 'vscode';
import { Conversation, ChatMessage } from '../types/index';
import { generateUUID } from '../core/utils';

export class ConversationManager {
    private conversations: Conversation[] = [];
    private activeConversationId: string | null = null;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.load();
    }

    public createNew(): Conversation {
        const initialSystemPrompt = `Sen Baykar bünyesinde çalışan, uzman bir yazılım geliştirme asistanısın. Cevaplarını, okunabilirliği artırmak için listeler, kalın metinler ve kod parçacıkları gibi zengin formatlar içeren Markdown formatında oluştur. Kod bloklarını python gibi dil belirterek ver.`;
        const newConv: Conversation = {
            id: generateUUID(),
            timestamp: Date.now(),
            title: "Yeni Konuşma",
            messages: [{ role: 'system', content: initialSystemPrompt }]
        };
        this.conversations.push(newConv);
        this.activeConversationId = newConv.id;
        return newConv;
    }

    public getActive(): Conversation | undefined {
        if (!this.activeConversationId) {
            if (this.conversations.length > 0) {
                this.activeConversationId = this.conversations.sort((a, b) => b.timestamp - a.timestamp)[0].id;
            } else {
                return undefined;
            }
        }
        return this.conversations.find(c => c.id === this.activeConversationId);
    }

    public addMessage(role: 'user' | 'assistant', content: string): void {
        const activeConv = this.getActive();
        if (activeConv) {
            if (activeConv.title === "Yeni Konuşma" && role === 'user') {
                 activeConv.title = content.length > 40 ? content.substring(0, 37) + '...' : content;
            }
            activeConv.messages.push({ role, content });
            activeConv.timestamp = Date.now();
            this.save();
        }
    }
    
    public removeLastMessage(): void {
        const activeConv = this.getActive();
        if (activeConv) {
            activeConv.messages.pop();
        }
    }

    public getHistorySummary(): { id: string, title: string }[] {
        return this.conversations
            .sort((a, b) => b.timestamp - a.timestamp)
            .map(c => ({ id: c.id, title: c.title }));
    }

    public switchConversation(id: string): Conversation | undefined {
        const conversation = this.conversations.find(c => c.id === id);
        if (conversation) {
            this.activeConversationId = id;
        }
        return conversation;
    }

    public deleteConversation(id: string): Conversation | null {
        this.conversations = this.conversations.filter(c => c.id !== id);
        
        if (this.activeConversationId === id) {
            const lastConversation = this.conversations.sort((a, b) => b.timestamp - a.timestamp)[0];
            if (lastConversation) {
                this.activeConversationId = lastConversation.id;
                return lastConversation;
            } else {
                const newConv = this.createNew();
                this.activeConversationId = newConv.id;
                return null; // Yeni ve boş bir konuşma oluşturulduğunu belirtir.
            }
        }
        this.save();
        return this.getActive() ?? null;
    }

    private async save() {
        const conversationsToSave = this.conversations
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 50); // Son 50 konuşmayı sakla
        await this.context.workspaceState.update('baykar.conversations', conversationsToSave);
    }

    private load() {
        const savedConversations = this.context.workspaceState.get<Conversation[]>('baykar.conversations');
        if (savedConversations && savedConversations.length > 0) {
            this.conversations = savedConversations;
            this.activeConversationId = this.conversations.sort((a,b) => b.timestamp - a.timestamp)[0].id;
        } else {
            this.createNew();
        }
    }
}