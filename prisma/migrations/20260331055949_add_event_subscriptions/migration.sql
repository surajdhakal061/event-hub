-- CreateTable
CREATE TABLE "event_subscriptions" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "webhookUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_subscriptions_appId_idx" ON "event_subscriptions"("appId");

-- CreateIndex
CREATE INDEX "event_subscriptions_eventName_idx" ON "event_subscriptions"("eventName");

-- CreateIndex
CREATE INDEX "event_subscriptions_appId_isActive_idx" ON "event_subscriptions"("appId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "event_subscriptions_appId_eventName_key" ON "event_subscriptions"("appId", "eventName");

-- CreateIndex
CREATE INDEX "events_eventName_idx" ON "events"("eventName");

-- AddForeignKey
ALTER TABLE "event_subscriptions" ADD CONSTRAINT "event_subscriptions_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
