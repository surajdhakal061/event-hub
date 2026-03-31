/*
  Warnings:

  - A unique constraint covering the columns `[appId,eventName,recipientEmail]` on the table `event_subscriptions` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "event_subscriptions_appId_eventName_key";

-- CreateIndex
CREATE UNIQUE INDEX "event_subscriptions_appId_eventName_recipientEmail_key" ON "event_subscriptions"("appId", "eventName", "recipientEmail");
