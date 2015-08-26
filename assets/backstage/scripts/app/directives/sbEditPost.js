(function () {
	'use strict';

	angular.module('sailsBlog').directive('sbEditPost', [
		'Author', 'getSession', '$state', '$stateParams', 'Post', 'parseWLError',
		function (Author, getSession, $state, $stateParams, Post, parseWLError) {
			return {
				restrict: 'E',
				scope: {},
				templateUrl: '/backstage/scripts/app/directives/sbEditPost.html',
				link: function (scope, element, attrs) {
					var _originalPost = {
						title: '',
						slug: '',
						body: '',
						author: ''
					};

					scope.isNew = !$stateParams.postId;
					scope.author = null;
					scope.isOwner = false;
					scope.saving = false;

					function resetUi () {
						scope.post = _.cloneDeep(_originalPost);
						scope.success = null;
						scope.error = null;
					}
					resetUi();

					var _getSession = getSession().then(function (currentAuthor) {
						scope.currentAuthor = currentAuthor;
					});

					if (!scope.isNew) {
						scope.post = Post.get({ postId: $stateParams.postId });
						scope.post.$promise.then(function (post) {
							_originalPost = post.toJSON();
							_getSession.then(function () {
								scope.isOwner = scope.currentAuthor.id === post.author;
							});

							Author.get({ authorId: post.author }).$promise.then(function (author) {
								scope.author = author;
							});
						});
					} else {
						_getSession.then(function () {
							_originalPost.author = scope.post.author = scope.currentAuthor.id;
							scope.isOwner = true;
							scope.author = scope.currentAuthor;
						});
					}

					scope.submit = function () {
						scope.saving = true;
						if (!scope.post.slug) delete scope.post.slug;
						var promise;
						if (!scope.isNew) {
							promise = Post.update({ postId: $stateParams.postId }, scope.post).$promise;
						} else {
							promise = Post.create(scope.post).$promise;
						}

						promise.then(
							function (post) {
								_originalPost = post.toJSON();
								scope.saving = false;
								resetUi();
								scope.success = 'The post has been saved successfully!';
								scope.isNew = false;
								$stateParams.postId = post.id;
							},
							function (err) {
								scope.success = null;
								scope.error = parseWLError(err) || { summary: err.data.message || 'An unknown error occurred.' };
								scope.saving = false;
							}
						);
					};

					scope.cancel = function () {
						var pristinePost = _.omit(scope.post, function (val, key) { return _.startsWith(key, '$') || key === 'toJSON'; });
						if (_.isEqual(pristinePost, _originalPost) || confirm('Are you sure you want to discard your unsaved changes?')) {
							resetUi();
							$state.go('posts');
						}
					};

					scope.destroy = function () {
						if (confirm('Are you sure you want to delete `' + scope.post.title + '`?')) {
							Post['delete']({ postId: $stateParams.postId }).$promise.then(function () {
								$state.go('posts');
							});
						}
					};

					scope.$watch('post.body', function () {
						scope.previewBody = markdown.toHTML(scope.post.body || '');
					});
				}
			};
		}
	]);
})();