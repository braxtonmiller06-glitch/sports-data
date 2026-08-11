# Railway's default builder (Railpack) inspects the repository root, finds no
# package.json there -- the app lives in frontend/ -- and fails the build with
# "could not determine how to build the app". A Dockerfile sidesteps
# autodetection entirely: Railway uses it verbatim whichever builder is
# selected, so the deploy no longer depends on the layout being guessable.

FROM node:22-slim AS build

WORKDIR /app/frontend

# Copied before the rest of the source so this layer is cached on any change
# that doesn't touch the dependency set.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

# Vite substitutes these into the bundle during `npm run build`, so they have to
# be present for that RUN, not at container start. Railway exposes a service's
# variables to the build as args of the same name.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Without these the bundle still compiles cleanly, but createClient() throws
# while the page is loading and every visitor gets a blank white screen, with
# the reason visible only in their browser console. Stopping here converts that
# into a build failure that names the variable that is missing.
RUN test -n "$VITE_SUPABASE_URL" || { \
      echo "VITE_SUPABASE_URL is empty. Set it in the Railway service variables."; exit 1; }
RUN test -n "$VITE_SUPABASE_ANON_KEY" || { \
      echo "VITE_SUPABASE_ANON_KEY is empty. Set it in the Railway service variables."; exit 1; }

RUN npm run build


FROM node:22-slim

WORKDIR /app
RUN npm install --global serve@14
COPY --from=build /app/frontend/dist ./dist

# -s serves index.html for any path that isn't a real file, so client-side
# routes such as /dashboard resolve instead of 404ing on a refresh.
ENV PORT=8080
CMD ["sh", "-c", "serve -s dist -l ${PORT}"]
