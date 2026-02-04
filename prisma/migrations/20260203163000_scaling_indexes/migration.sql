-- CreateIndex
CREATE INDEX "FeedItem_artistId_idx" ON "FeedItem"("artistId");

-- CreateIndex
CREATE INDEX "FeedItem_mediaPostId_idx" ON "FeedItem"("mediaPostId");

-- CreateIndex
CREATE INDEX "FeedItem_postId_idx" ON "FeedItem"("postId");

-- CreateIndex
CREATE INDEX "FeedItem_videoId_idx" ON "FeedItem"("videoId");

-- CreateIndex
CREATE INDEX "Music_musicArtistId_idx" ON "Music"("musicArtistId");

-- CreateIndex
CREATE INDEX "Music_musicAlbumId_idx" ON "Music"("musicAlbumId");

-- CreateIndex
CREATE INDEX "Music_musicFileId_idx" ON "Music"("musicFileId");

-- CreateIndex
CREATE INDEX "MusicAlbum_musicArtistId_idx" ON "MusicAlbum"("musicArtistId");
