"""WebSocket endpoint for real-time updates."""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections per user."""

    def __init__(self):
        # Map of user_id to list of WebSocket connections
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        """Accept and register a WebSocket connection for a user."""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info(f"WebSocket connected for user {user_id}. Total connections: {len(self.active_connections[user_id])}")

    def disconnect(self, websocket: WebSocket, user_id: int):
        """Remove a WebSocket connection for a user."""
        if user_id in self.active_connections:
            try:
                self.active_connections[user_id].remove(websocket)
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
                logger.info(f"WebSocket disconnected for user {user_id}")
            except ValueError:
                pass  # Connection was already removed

    async def send_to_user(self, user_id: int, message: dict):
        """Send a message to all connections for a specific user."""
        if user_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.warning(f"Failed to send message to user {user_id}: {e}")
                    disconnected.append(connection)

            # Clean up disconnected connections
            for conn in disconnected:
                self.disconnect(conn, user_id)

    async def send_to_users(self, user_ids: list[int], message: dict):
        """Send a message to multiple users."""
        for user_id in user_ids:
            await self.send_to_user(user_id, message)

    async def broadcast(self, message: dict):
        """Send a message to all connected users."""
        for user_id in list(self.active_connections.keys()):
            await self.send_to_user(user_id, message)

    def get_connected_user_ids(self) -> list[int]:
        """Get list of all connected user IDs."""
        return list(self.active_connections.keys())

    def is_user_connected(self, user_id: int) -> bool:
        """Check if a user has any active connections."""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0


# Global connection manager instance
manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time updates.

    Requires token query parameter for authentication.
    Supports ping/pong keepalive messages.

    Message types sent to clients:
    - notification: New notification received
    - shift_update: Shift status changed
    - application_update: Application status changed
    """
    from app.api.deps import get_current_user_ws

    # Get token from query params
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return

    user = None
    try:
        user = await get_current_user_ws(token)
        if not user:
            await websocket.close(code=4001, reason="Invalid authentication token")
            return

        await manager.connect(websocket, user.id)

        try:
            while True:
                data = await websocket.receive_text()

                # Handle ping/pong for keepalive
                if data == "ping":
                    await websocket.send_text("pong")
                else:
                    # Handle other message types if needed
                    try:
                        message = json.loads(data)
                        message_type = message.get("type")

                        if message_type == "subscribe":
                            # Could implement channel subscriptions here
                            await websocket.send_json({
                                "type": "subscribed",
                                "data": {"channel": message.get("channel")}
                            })
                        elif message_type == "unsubscribe":
                            await websocket.send_json({
                                "type": "unsubscribed",
                                "data": {"channel": message.get("channel")}
                            })
                    except json.JSONDecodeError:
                        # Ignore invalid JSON
                        pass

        except WebSocketDisconnect:
            manager.disconnect(websocket, user.id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if user:
            manager.disconnect(websocket, user.id)
        try:
            await websocket.close(code=4001, reason="Authentication failed")
        except Exception:
            pass  # Connection may already be closed
