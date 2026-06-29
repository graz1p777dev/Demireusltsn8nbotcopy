from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import Client, Conversation, Lead, Message, MessageBuffer
from app.schemas.amocrm import IncomingMessage


def upsert_incoming(db: Session, incoming: IncomingMessage) -> tuple[Lead, Conversation, bool]:
    existing = db.scalar(select(Message).where(Message.message_id == incoming.message_id))
    if existing:
        return db.get(Lead, existing.lead_id), db.get(Conversation, existing.conversation_id), False  # type: ignore

    client = db.scalar(select(Client).where(Client.amocrm_author_id == incoming.client_id))
    if not client:
        client = Client(
            amocrm_author_id=incoming.client_id,
            name=incoming.client_name,
            source=incoming.source,
        )
        db.add(client)
        db.flush()

    lead = db.scalar(select(Lead).where(Lead.amocrm_lead_id == incoming.lead_id))
    if not lead:
        lead = Lead(
            amocrm_lead_id=incoming.lead_id,
            client_id=client.id,
            chat_id=incoming.chat_id,
            contact_id=incoming.contact_id,
            last_message_at=incoming.timestamp,
        )
        db.add(lead)
        db.flush()
    else:
        lead.chat_id = incoming.chat_id or lead.chat_id
        lead.contact_id = incoming.contact_id or lead.contact_id
        lead.last_message_at = incoming.timestamp

    conversation = db.scalar(
        select(Conversation).where(
            Conversation.lead_id == lead.id,
            Conversation.chat_id == incoming.chat_id,
        )
    )
    if not conversation:
        conversation = Conversation(lead_id=lead.id, chat_id=incoming.chat_id)
        db.add(conversation)
        db.flush()

    text = incoming.text
    photo_url = incoming.attachment_link or incoming.media or None
    if not text and photo_url:
        text = f"[{incoming.attachment_type or 'picture'}] {photo_url}"

    db.add(
        Message(
            conversation_id=conversation.id,
            lead_id=lead.id,
            message_id=incoming.message_id,
            role="user",
            direction="incoming",
            text=text,
            message_type=incoming.attachment_type or "text",
            media_url=incoming.attachment_link,
            status="queued",
            raw_payload=incoming.raw,
        )
    )
    db.add(
        MessageBuffer(
            lead_id=lead.id,
            conversation_id=conversation.id,
            message_id=incoming.message_id,
            text=text,
            timestamp=incoming.timestamp,
        )
    )
    db.commit()
    return lead, conversation, True

